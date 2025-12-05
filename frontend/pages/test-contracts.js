import { useState } from 'react';
import { Navbar } from '@/components/navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { 
  useInitializeProfile, 
  useSelectPet, 
  useSendFriendRequest,
  getUserProfile 
} from '@/lib/solana/hooks/useSocialProgram';
import { 
  useInitializeExpenseStats,
  getExpenseStats 
} from '@/lib/solana/hooks/useExpenseProgram';
import { 
  useInitializeChatRoom,
  useSendMessage,
  getChatRoom 
} from '@/lib/solana/hooks/useChatProgram';
import { getProgram } from '@/lib/solana/anchorSetup';

/**
 * 合约测试页面
 * 测试所有 Solana 智能合约功能
 */
export default function TestContracts() {
  const { publicKey, connected, sendTransaction } = useWallet();
  const [username, setUsername] = useState('');
  const [petId, setPetId] = useState(1);
  const [friendAddress, setFriendAddress] = useState('');
  const [message, setMessage] = useState('');
  const [testResults, setTestResults] = useState([]);

  // Hooks
  const { initializeProfile, isLoading: profileLoading } = useInitializeProfile();
  const { selectPet, isLoading: petLoading } = useSelectPet();
  const { sendFriendRequest, isLoading: friendLoading } = useSendFriendRequest();
  const { initializeExpenseStats, isLoading: expenseLoading } = useInitializeExpenseStats();
  const { initializeChatRoom, isLoading: chatRoomLoading } = useInitializeChatRoom();
  const { sendMessage: sendChatMessage, isLoading: messageLoading } = useSendMessage();

  const addResult = (test, success, data) => {
    setTestResults(prev => [{
      test,
      success,
      data,
      timestamp: new Date().toLocaleTimeString()
    }, ...prev]);
  };

  // 测试 1: 初始化档案
  const handleInitializeProfile = async () => {
    if (!username) {
      alert('Please enter a username');
      return;
    }

    const result = await initializeProfile(username);
    addResult('Initialize Profile', result.success, result);
  };

  // 测试 2: 选择宠物
  const handleSelectPet = async () => {
    const result = await selectPet(petId);
    addResult('Select Pet', result.success, result);
  };

  // 测试 3: 发送好友请求
  const handleSendFriendRequest = async () => {
    if (!friendAddress) {
      alert('Please enter friend address');
      return;
    }

    try {
      const friendPubkey = new PublicKey(friendAddress);
      const result = await sendFriendRequest(friendPubkey);
      addResult('Send Friend Request', result.success, result);
    } catch (err) {
      addResult('Send Friend Request', false, { error: err.message });
    }
  };

  // 测试 4: 初始化消费统计
  const handleInitializeExpenseStats = async () => {
    const result = await initializeExpenseStats();
    addResult('Initialize Expense Stats', result.success, result);
  };

  // 测试 5: 初始化聊天室
  const handleInitializeChatRoom = async () => {
    if (!friendAddress) {
      alert('Please enter friend address');
      return;
    }

    try {
      const friendPubkey = new PublicKey(friendAddress);
      const result = await initializeChatRoom(friendPubkey);
      addResult('Initialize Chat Room', result.success, result);
    } catch (err) {
      addResult('Initialize Chat Room', false, { error: err.message });
    }
  };

  // 测试 6: 发送消息
  const handleSendMessage = async () => {
    if (!friendAddress || !message) {
      alert('Please enter friend address and message');
      return;
    }

    try {
      const friendPubkey = new PublicKey(friendAddress);
      const result = await sendChatMessage(friendPubkey, message);
      addResult('Send Message', result.success, result);
      setMessage('');
    } catch (err) {
      addResult('Send Message', false, { error: err.message });
    }
  };

  // 测试 7: 读取档案
  const handleReadProfile = async () => {
    try {
      const program = getProgram({ publicKey, sendTransaction });
      const profile = await getUserProfile(program, publicKey);
      addResult('Read Profile', !!profile, profile);
    } catch (err) {
      addResult('Read Profile', false, { error: err.message });
    }
  };

  // 测试 8: 读取消费统计
  const handleReadExpenseStats = async () => {
    try {
      const program = getProgram({ publicKey, sendTransaction });
      const stats = await getExpenseStats(program, publicKey);
      addResult('Read Expense Stats', !!stats, stats);
    } catch (err) {
      addResult('Read Expense Stats', false, { error: err.message });
    }
  };

  // 测试 9: 读取聊天室
  const handleReadChatRoom = async () => {
    if (!friendAddress) {
      alert('Please enter friend address');
      return;
    }

    try {
      const program = getProgram({ publicKey, sendTransaction });
      const friendPubkey = new PublicKey(friendAddress);
      const chatRoom = await getChatRoom(program, publicKey, friendPubkey);
      addResult('Read Chat Room', !!chatRoom, chatRoom);
    } catch (err) {
      addResult('Read Chat Room', false, { error: err.message });
    }
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Contract Testing</h1>
          <p className="text-neutral-400">Please connect your wallet to test contracts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      <Navbar />
      
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <h1 className="text-3xl font-bold text-white mb-6">🧪 Contract Testing</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧: 测试操作 */}
          <div className="space-y-4">
            {/* 社交功能测试 */}
            <Card className="bg-neutral-900/80 border-neutral-800 p-6">
              <h2 className="text-xl font-bold text-white mb-4">👥 Social Functions</h2>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-neutral-400 mb-1 block">Username</label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    className="bg-neutral-800 border-neutral-700 text-white"
                  />
                </div>
                <Button
                  onClick={handleInitializeProfile}
                  disabled={profileLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {profileLoading ? 'Loading...' : '1. Initialize Profile'}
                </Button>

                <div>
                  <label className="text-sm text-neutral-400 mb-1 block">Pet ID (1-10)</label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={petId}
                    onChange={(e) => setPetId(parseInt(e.target.value))}
                    className="bg-neutral-800 border-neutral-700 text-white"
                  />
                </div>
                <Button
                  onClick={handleSelectPet}
                  disabled={petLoading}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {petLoading ? 'Loading...' : '2. Select Pet'}
                </Button>

                <div>
                  <label className="text-sm text-neutral-400 mb-1 block">Friend Address</label>
                  <Input
                    value={friendAddress}
                    onChange={(e) => setFriendAddress(e.target.value)}
                    placeholder="Enter friend's wallet address"
                    className="bg-neutral-800 border-neutral-700 text-white"
                  />
                </div>
                <Button
                  onClick={handleSendFriendRequest}
                  disabled={friendLoading}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {friendLoading ? 'Loading...' : '3. Send Friend Request'}
                </Button>

                <Button
                  onClick={handleReadProfile}
                  className="w-full bg-neutral-700 hover:bg-neutral-600"
                >
                  📖 Read Profile
                </Button>
              </div>
            </Card>

            {/* 消费追踪测试 */}
            <Card className="bg-neutral-900/80 border-neutral-800 p-6">
              <h2 className="text-xl font-bold text-white mb-4">💰 Expense Functions</h2>
              
              <div className="space-y-3">
                <Button
                  onClick={handleInitializeExpenseStats}
                  disabled={expenseLoading}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                >
                  {expenseLoading ? 'Loading...' : '4. Initialize Expense Stats'}
                </Button>

                <Button
                  onClick={handleReadExpenseStats}
                  className="w-full bg-neutral-700 hover:bg-neutral-600"
                >
                  📖 Read Expense Stats
                </Button>
              </div>
            </Card>

            {/* 聊天功能测试 */}
            <Card className="bg-neutral-900/80 border-neutral-800 p-6">
              <h2 className="text-xl font-bold text-white mb-4">💬 Chat Functions</h2>
              
              <div className="space-y-3">
                <Button
                  onClick={handleInitializeChatRoom}
                  disabled={chatRoomLoading}
                  className="w-full bg-cyan-600 hover:bg-cyan-700"
                >
                  {chatRoomLoading ? 'Loading...' : '5. Initialize Chat Room'}
                </Button>

                <div>
                  <label className="text-sm text-neutral-400 mb-1 block">Message</label>
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter message"
                    className="bg-neutral-800 border-neutral-700 text-white"
                  />
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={messageLoading}
                  className="w-full bg-pink-600 hover:bg-pink-700"
                >
                  {messageLoading ? 'Loading...' : '6. Send Message'}
                </Button>

                <Button
                  onClick={handleReadChatRoom}
                  className="w-full bg-neutral-700 hover:bg-neutral-600"
                >
                  📖 Read Chat Room
                </Button>
              </div>
            </Card>
          </div>

          {/* 右侧: 测试结果 */}
          <div>
            <Card className="bg-neutral-900/80 border-neutral-800 p-6 sticky top-6">
              <h2 className="text-xl font-bold text-white mb-4">📊 Test Results</h2>
              
              <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
                {testResults.length === 0 ? (
                  <p className="text-neutral-500 text-center py-8">No tests run yet</p>
                ) : (
                  testResults.map((result, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${
                        result.success
                          ? 'bg-green-900/20 border-green-500/50'
                          : 'bg-red-900/20 border-red-500/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-white">{result.test}</span>
                        <span className="text-xs text-neutral-400">{result.timestamp}</span>
                      </div>
                      <div className={`text-sm ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                        {result.success ? '✅ Success' : '❌ Failed'}
                      </div>
                      <pre className="mt-2 text-xs text-neutral-300 bg-neutral-950/50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </div>
                  ))
                )}
              </div>

              {testResults.length > 0 && (
                <Button
                  onClick={() => setTestResults([])}
                  variant="outline"
                  className="w-full mt-4 bg-neutral-800 border-neutral-700"
                >
                  Clear Results
                </Button>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
