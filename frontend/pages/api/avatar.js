import db from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  limit 
} from 'firebase/firestore';

/**
 * Avatar API
 * GET: Get user avatar by wallet address
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { walletAddress } = req.query;

    if (!walletAddress) {
      return res.status(400).json({ 
        success: false, 
        error: 'walletAddress parameter required' 
      });
    }

    const profilesRef = collection(db, 'profiles');
    const q = query(
      profilesRef,
      where('walletAddress', '==', walletAddress),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const profileData = querySnapshot.docs[0].data();
      // Return avatar filename (e.g., "1.png"), frontend will use /avatar/{name} to display
      return res.status(200).json({ 
        success: true, 
        avatar: profileData.avatar || null // Just the filename like "1.png"
      });
    } else {
      return res.status(404).json({ 
        success: false, 
        error: 'Profile not found' 
      });
    }
  } catch (error) {
    console.error('Avatar API error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch avatar' 
    });
  }
}
