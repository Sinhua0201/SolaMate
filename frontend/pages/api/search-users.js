import db from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

/**
 * Search Users API
 * Search for users by username for @mentions
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.status(200).json({ 
        success: true, 
        users: [] 
      });
    }

    const profilesRef = collection(db, 'profiles');
    const searchQuery = q.toLowerCase();

    // Search for usernames that start with the query
    const q1 = query(
      profilesRef,
      where('username', '>=', searchQuery),
      where('username', '<=', searchQuery + '\uf8ff'),
      limit(10)
    );

    const querySnapshot = await getDocs(q1);
    const users = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      users.push({
        id: doc.id,
        username: data.displayName || data.username,
        walletAddress: data.walletAddress,
        avatar: data.avatar,
      });
    });

    res.status(200).json({ 
      success: true, 
      users 
    });

  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Search failed',
      details: error.message 
    });
  }
}
