import { useState } from 'react';
import { Navbar } from '@/components/navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWallet } from '@solana/wallet-adapter-react';

/**
 * 简单测试页面 - 不使用区块链
 * 测试 Firebase 和宠物系统
 */
export default function TestSimple() {
  const { publicKey, connected } = useWallet();
  const [username, setUsername] = useState('');
  const [testResults, setTestResults] = useState([]);
  const [avatar, setAvatar] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);

  const walletAddress = publicKey?.toString();

  const addResult = (test, success, data) => {
    setTestResults(prev => [{
      test,
      success,
      data,
      timestamp: new Date().toLocaleTimeString()
    }, ...prev]);
  };

  // 测试 1: 创建档案
  const handleCreateProfile = async () => {
    if (!username) {
      alert('Please enter a username');
      return;
    }

    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          username,
          avatar: avatar || null,
        }),
      });

      const data = await response.json();
      addResult('Create Profile', data.success, data);
    } catch (error) {
      addResult('Create Profile', false, { error: error.message });
    }
  };

  // 测试 2: 读取档案
  const handleReadProfile = async () => {
    try {
      const response = await fetch(`/api/profile?walletAddress=${walletAddress}`);
      const data = await response.json();
      addResult('Read Profile', data.success, data);
    } catch (error) {
      addResult('Read Profile', false, { error: error.message });
    }
  };

  // 测试 3: 删除了宠物功能

  // 测试 4: 获取头像
  const handleGetAvatar = async () => {
    try {
      const response = await fetch(`/api/avatar?walletAddress=${walletAddress}`);
      const data = await response.json();
      addResult('Get Avatar', data.success, data);
    } catch (error) {
      addResult('Get Avatar', false, { error: error.message });
    }
  };

  // 处理头像上传
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      setAvatar(base64String);
      setAvatarPreview(base64String);
    };
    reader.readAsDataURL(file);
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Simple Testing</h1>
          <p className="text-neutral-400">Please connect your wallet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      <Navbar />
      
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <h1 className="text-3xl font-bold text-white mb-6">🧪 Simple Testing (No Blockchain)</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧: 测试操作 */}
          <div className="space-y-4">
            {/* 档案测试 */}
            <Card className="bg-neutral-900/80 border-neutral-800 p-6">
              <h2 className="text-xl font-bold text-white mb-4">👤 Profile Functions</h2>
              
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

                <div>
                  <label className="text-sm text-neutral-400 mb-1 block">Avatar</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="w-full text-sm text-neutral-400"
                  />
                  {avatarPreview && (
                    <img 
                      src={avatarPreview} 
                      alt="Preview" 
                      className="mt-2 w-20 h-20 rounded-full object-cover"
                    />
                  )}
                </div>

                <Button
                  onClick={handleCreateProfile}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  1. Create/Update Profile
                </Button>

                <Button
                  onClick={handleReadProfile}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  2. Read Profile
                </Button>

                <Button
                  onClick={handleGetAvatar}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                >
                  3. Get Avatar
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
                      <pre className="mt-2 text-xs text-neutral-300 bg-neutral-950/50 p-2 rounded overflow-x-auto max-h-40">
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
