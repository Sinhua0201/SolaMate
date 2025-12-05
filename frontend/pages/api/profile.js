import db from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  updateDoc,
  doc,
  limit,
  Timestamp 
} from 'firebase/firestore';

/**
 * Profile API
 * GET: Check if profile exists for wallet address
 * POST: Create or update user profile
 */
export default async function handler(req, res) {
  try {
    const profilesRef = collection(db, 'profiles');

    if (req.method === 'GET') {
      const { walletAddress } = req.query;

      if (!walletAddress) {
        return res.status(400).json({ 
          success: false, 
          error: 'walletAddress parameter required' 
        });
      }

      const normalizedAddress = walletAddress; // Keep original case for Solana addresses
      
      // Check if profile exists
      const q = query(
        profilesRef,
        where('walletAddress', '==', normalizedAddress),
        limit(1)
      );

      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const profileData = querySnapshot.docs[0].data();
        
        // 不返回 avatar，太大了
        const profile = {
          id: querySnapshot.docs[0].id,
          walletAddress: profileData.walletAddress,
          username: profileData.username,
          displayName: profileData.displayName,
          createdAt: profileData.createdAt,
          updatedAt: profileData.updatedAt,
          // avatar 只在需要时单独获取
        };
        
        return res.status(200).json({ 
          success: true, 
          exists: true,
          profile 
        });
      } else {
        return res.status(200).json({ 
          success: true, 
          exists: false 
        });
      }
      
    } else if (req.method === 'POST') {
      const { walletAddress, username, avatar } = req.body;

      if (!walletAddress || !username) {
        return res.status(400).json({ 
          success: false, 
          error: 'walletAddress and username are required' 
        });
      }

      const normalizedAddress = walletAddress; // Keep original case for Solana addresses
      const normalizedUsername = username.toLowerCase();

      // Check if username is already taken
      const usernameQuery = query(
        profilesRef,
        where('username', '==', normalizedUsername)
      );
      
      const usernameSnapshot = await getDocs(usernameQuery);
      
      if (!usernameSnapshot.empty) {
        // Check if it's the same wallet (updating own profile)
        const existingProfile = usernameSnapshot.docs[0].data();
        if (existingProfile.walletAddress !== normalizedAddress) {
          return res.status(400).json({ 
            success: false, 
            error: 'Username already taken' 
          });
        }
      }

      // Check if profile exists for this wallet
      const walletQuery = query(
        profilesRef,
        where('walletAddress', '==', normalizedAddress)
      );
      
      const walletSnapshot = await getDocs(walletQuery);

      const profileData = {
        walletAddress: normalizedAddress,
        username: normalizedUsername,
        displayName: username, // Keep original case for display
        avatar: avatar || null,
        updatedAt: Timestamp.now(),
      };

      if (!walletSnapshot.empty) {
        // Update existing profile
        const docId = walletSnapshot.docs[0].id;
        const docRef = doc(db, 'profiles', docId);
        await updateDoc(docRef, profileData);
        
        // 返回时不包含 avatar
        return res.status(200).json({ 
          success: true, 
          message: 'Profile updated',
          profile: { 
            id: docId, 
            walletAddress: profileData.walletAddress,
            username: profileData.username,
            displayName: profileData.displayName,
            updatedAt: profileData.updatedAt
          }
        });
      } else {
        // Create new profile
        profileData.createdAt = Timestamp.now();
        const docRef = await addDoc(profilesRef, profileData);
        
        // 返回时不包含 avatar
        return res.status(200).json({ 
          success: true, 
          message: 'Profile created',
          profile: { 
            id: docRef.id,
            walletAddress: profileData.walletAddress,
            username: profileData.username,
            displayName: profileData.displayName,
            createdAt: profileData.createdAt
          }
        });
      }
      
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Profile API error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Database operation failed',
      details: error.message 
    });
  }
}
