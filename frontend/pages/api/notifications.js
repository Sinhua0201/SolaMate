import db from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  limit, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc,
  Timestamp 
} from 'firebase/firestore';

/**
 * API endpoint to manage notifications using Firebase Firestore
 * GET: Fetch latest notification for a specific wallet address
 * POST: Save new notifications
 * DELETE: Remove a notification by ID
 */
export default async function handler(req, res) {
  try {
    const notificationsRef = collection(db, 'notifications');

    if (req.method === 'GET') {
      try {
        const { walletAddress } = req.query;

        if (!walletAddress) {
          return res.status(400).json({ 
            success: false, 
            error: 'walletAddress parameter required' 
          });
        }

        // Normalize wallet address (lowercase for comparison)
        const normalizedAddress = walletAddress.toLowerCase();
        
        // Fetch notifications for this wallet address (without orderBy to avoid index requirement)
        const q = query(
          notificationsRef,
          where('to', '==', normalizedAddress),
          limit(10)
        );

        const querySnapshot = await getDocs(q);
        const allNotifications = [];
        
        querySnapshot.forEach((docSnap) => {
          allNotifications.push({
            id: docSnap.id,
            ...docSnap.data(),
            // Convert Firestore Timestamp to ISO string
            createdAt: docSnap.data().createdAt?.toDate?.()?.toISOString() || docSnap.data().createdAt,
            timestamp: docSnap.data().timestamp
          });
        });
        
        // Sort by createdAt on the client side
        allNotifications.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA; // Descending order
        });
        
        const latestNotification = allNotifications.slice(0, 1);

        console.log('Fetching notifications for:', walletAddress);
        console.log('Found:', latestNotification.length, 'notifications');

        res.status(200).json({ 
          success: true, 
          notification: latestNotification[0] || null,
          hasNotification: latestNotification.length > 0
        });
      } catch (error) {
        console.error('Error reading notifications:', error);
        res.status(500).json({ 
          success: false, 
          error: 'Failed to read notifications' 
        });
      }
    } else if (req.method === 'POST') {
      try {
        const newNotifications = req.body.notifications || [];
        
        if (newNotifications.length === 0) {
          return res.status(400).json({ 
            success: false, 
            error: 'No notifications provided' 
          });
        }

        // Normalize wallet addresses to lowercase and add timestamps
        const notificationsWithTimestamp = newNotifications.map(notif => ({
          ...notif,
          to: notif.to?.toLowerCase(), // Normalize to lowercase
          from: notif.from?.toLowerCase(), // Normalize from as well
          timestamp: notif.timestamp || new Date().toISOString(),
          createdAt: Timestamp.now(), // Firestore Timestamp
        }));

        console.log('Saving notifications:', notificationsWithTimestamp.length);
        console.log('Recipients:', notificationsWithTimestamp.map(n => n.to));

        // Insert notifications into Firestore
        const insertedIds = [];
        for (const notification of notificationsWithTimestamp) {
          const docRef = await addDoc(notificationsRef, notification);
          insertedIds.push(docRef.id);
        }

        res.status(200).json({ 
          success: true, 
          message: 'Notifications saved successfully',
          count: insertedIds.length,
          ids: insertedIds
        });
      } catch (error) {
        console.error('Error saving notifications:', error);
        res.status(500).json({ 
          success: false, 
          error: 'Failed to save notifications' 
        });
      }
    } else if (req.method === 'DELETE') {
      try {
        const { notificationId } = req.body;

        if (!notificationId) {
          return res.status(400).json({ 
            success: false, 
            error: 'notificationId required' 
          });
        }

        // Remove notification by document ID
        const docRef = doc(db, 'notifications', notificationId);
        await deleteDoc(docRef);

        res.status(200).json({ 
          success: true, 
          message: 'Notification removed successfully',
          deleted: true
        });
      } catch (error) {
        console.error('Error removing notification:', error);
        res.status(500).json({ 
          success: false, 
          error: 'Failed to remove notification' 
        });
      }
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Firestore connection error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Database connection failed' 
    });
  }
}
