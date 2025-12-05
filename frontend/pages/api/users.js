import db from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

/**
 * Users API
 * GET: Get all users with profiles
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const profilesRef = collection(db, 'profiles');
    const querySnapshot = await getDocs(profilesRef);
    
    const users = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      users.push({
        id: doc.id,
        username: data.username,
        displayName: data.displayName,
        avatar: data.avatar,
        walletAddress: data.walletAddress,
      });
    });

    return res.status(200).json({ 
      success: true, 
      users 
    });
  } catch (error) {
    console.error('Users API error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch users' 
    });
  }
}
