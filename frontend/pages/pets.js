import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useWallet } from '@solana/wallet-adapter-react';
import { Navbar } from '@/components/navbar';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { useSelectPet } from '@/lib/solana/hooks/useSocialProgram';
import { getProgram } from '@/lib/solana/anchorSetup';
import { getUserProfilePDA } from '@/lib/solana/pdaHelpers';
import { Loader2, Sparkles, Heart, Zap, Trophy, Target, Star, MessageCircle, Send, X, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import {
  getPetData,
  addXP,
  feedPet,
  playWithPet,
  updatePetStatus,
  getDailyTasks,
  updateTaskProgress,
  XP_REQUIRED,
  getNextActionTime,
} from '@/lib/petSystem';

const PETS = [
  { id: 1, name: 'Dragon', folder: 'dragon', description: 'All activities +15% XP' },
  { id: 2, name: 'Cat', folder: 'cat', description: 'Expense tracking +20% XP' },
  { id: 3, name: 'Dog', folder: 'dog', description: 'Friend interactions +20% XP' },
  { id: 4, name: 'Pig', folder: 'pig', description: 'Random 2x XP (10% chance)' },
  { id: 5, name: 'Monkey', folder: 'monkey', description: 'Task completion +40% XP' },
  { id: 6, name: 'Cow', folder: 'cow', description: 'Daily login +20 XP' },
  { id: 7, name: 'Rabbit', folder: 'rabbit', description: 'All activities +10% XP' },
  { id: 8, name: 'Tiger', folder: 'tiger', description: 'Large transfers +30% XP' },
  { id: 9, name: 'Goat', folder: 'goat', description: 'All categories +10% XP' },
  { id: 10, name: 'Mouse', folder: 'mouse', description: 'Messages +50% XP' },
];

// Helper to get pet image based on mood
const getPetImage = (folder, isHappy = true) => `/pet/${folder}/${isHappy ? 'happy' : 'sad'}.gif`;

// Pet random greetings
const PET_GREETINGS = {
  Dragon: ["I'm feeling mighty today~ 🔥", "Want to hear some ancient wisdom?", "Your XP is looking good!"],
  Cat: ["Meow~ Have you been saving money?", "...Pet me? Meow~", "How's your wallet doing? Meow~"],
  Dog: ["Woof woof! You're back!", "Did you chat with friends today? Woof!", "I missed you! Woof woof!"],
  Pig: ["Oink~ What should we eat today?", "Save money for yummy food! Oink~", "I'm hungry..."],
  Monkey: ["Hey hey! Tasks done yet?", "Let's play a game!", "I found a money-saving trick!"],
  Cow: ["Moo~ Steady progress today", "Consistency is key, moo~", "Take it slow, no rush~"],
  Rabbit: ["Hi there~ (◕ᴗ◕✿)", "Let's do our best today~", "Hop hop, so happy~"],
  Tiger: ["Roar! Any big moves today?", "I'll protect your wallet!", "Any investment plans?"],
  Goat: ["Baa~ How are you feeling?", "Balance is important, baa~", "Enjoy life slowly~"],
  Mouse: ["Squeak! Any news?", "I heard some gossip... squeak", "Your info mouse is here!"],
};

export default function PetsPage() {
  const { publicKey, connected } = useWallet();
  const [currentPet, setCurrentPet] = useState(null);
  const [petData, setPetData] = useState(null);
  const [dailyTasks, setDailyTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPetSelection, setShowPetSelection] = useState(false);
  const [feedCooldown, setFeedCooldown] = useState(0);
  const [playCooldown, setPlayCooldown] = useState(0);
  const { selectPet, isLoading: isSelecting } = useSelectPet();
  
  // Pet chat state
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [petGreeting, setPetGreeting] = useState('');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (connected && publicKey) {
      loadPetInfo();
      const interval = setInterval(updateCooldowns, 1000);
      return () => clearInterval(interval);
    }
  }, [connected, publicKey]);

  // 随机更换宠物问候语
  useEffect(() => {
    if (currentPet) {
      const pet = PETS[currentPet - 1];
      const greetings = PET_GREETINGS[pet?.name] || PET_GREETINGS.Cat;
      setPetGreeting(greetings[Math.floor(Math.random() * greetings.length)]);
      
      // 每30秒换一次问候语
      const interval = setInterval(() => {
        setPetGreeting(greetings[Math.floor(Math.random() * greetings.length)]);
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [currentPet]);

  // 聊天滚动到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const loadPetInfo = async () => {
    setIsLoading(true);
    try {
      const program = getProgram({ publicKey });
      const [userProfilePDA] = getUserProfilePDA(publicKey);
      const profile = await program.account.userProfile.fetchNullable(userProfilePDA);
      
      if (profile && profile.petId > 0) {
        setCurrentPet(profile.petId);
        const data = updatePetStatus(publicKey.toString());
        setPetData(data);
        setDailyTasks(getDailyTasks(publicKey.toString()));
      } else {
        setShowPetSelection(true);
      }
    } catch (err) {
      console.error('Error loading pet:', err);
      setShowPetSelection(true);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCooldowns = () => {
    if (!publicKey) return;
    
    const feedTime = getNextActionTime(publicKey.toString(), 'feed');
    const playTime = getNextActionTime(publicKey.toString(), 'play');
    const now = Date.now();
    
    setFeedCooldown(Math.max(0, Math.ceil((feedTime - now) / 1000)));
    setPlayCooldown(Math.max(0, Math.ceil((playTime - now) / 1000)));
  };

  const handleSelectPet = async (petId) => {
    const result = await selectPet(petId);
    if (result.success) {
      setCurrentPet(petId);
      setShowPetSelection(false);
      const data = getPetData(publicKey.toString());
      setPetData(data);
      setDailyTasks(getDailyTasks(publicKey.toString()));
    }
  };

  // Play TTS audio
  const playPetVoice = async (text) => {
    if (!voiceEnabled) return;
    
    try {
      const response = await fetch('/api/pet-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      
      const data = await response.json();
      
      if (data.audio) {
        const audio = new Audio(`data:audio/mpeg;base64,${data.audio}`);
        audio.play().catch(err => console.log('Audio play failed:', err));
      }
    } catch (err) {
      console.error('TTS error:', err);
    }
  };

  // Send chat message to pet
  const handleSendChat = async () => {
    if (!chatInput.trim() || isChatLoading) return;
    
    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);
    
    try {
      const pet = PETS[currentPet - 1];
      const response = await fetch('/api/pet-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          petName: pet?.name || 'Cat',
          userStats: petData,
          dailyTasks: dailyTasks,
        }),
      });
      
      const data = await response.json();
      
      if (data.reply) {
        setChatMessages(prev => [...prev, { role: 'pet', content: data.reply }]);
        // Play TTS for pet reply
        playPetVoice(data.reply);
      } else {
        setChatMessages(prev => [...prev, { role: 'pet', content: '...*yawns*' }]);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setChatMessages(prev => [...prev, { role: 'pet', content: 'Zzz... I fell asleep...' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const openChatModal = () => {
    const pet = PETS[currentPet - 1];
    const greetings = PET_GREETINGS[pet?.name] || PET_GREETINGS.Cat;
    setChatMessages([{ role: 'pet', content: greetings[Math.floor(Math.random() * greetings.length)] }]);
    setShowChatModal(true);
  };

  const handleFeed = () => {
    const result = feedPet(publicKey.toString());
    if (result.success) {
      const xpResult = addXP(publicKey.toString(), result.xpGained, currentPet);
      setPetData(xpResult);
      
      const taskResult = updateTaskProgress(publicKey.toString(), 'feed');
      if (taskResult.completed) {
        addXP(publicKey.toString(), taskResult.reward, currentPet);
      }
      setDailyTasks(getDailyTasks(publicKey.toString()));
      
      if (xpResult.leveledUp) {
        toast.success('🎉 Level Up!', {
          description: result.message,
        });
      } else {
        toast.success('🍖 Fed your pet!', {
          description: result.message,
        });
      }
    } else {
      toast.error('Cannot feed yet', {
        description: result.message,
      });
    }
  };

  const handlePlay = () => {
    const result = playWithPet(publicKey.toString());
    if (result.success) {
      const xpResult = addXP(publicKey.toString(), result.xpGained, currentPet);
      setPetData(xpResult);
      
      if (xpResult.leveledUp) {
        toast.success('🎉 Level Up!', {
          description: result.message,
        });
      } else {
        toast.success('🎮 Played with your pet!', {
          description: result.message,
        });
      }
    } else {
      toast.error('Cannot play yet', {
        description: result.message,
      });
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const xpProgress = petData ? ((petData.xp - XP_REQUIRED[petData.level]) / (XP_REQUIRED[petData.level + 1] - XP_REQUIRED[petData.level])) * 100 : 0;

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-200/30 via-transparent to-transparent pointer-events-none" />
        <Navbar />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <Card className="glass-card p-8 text-center max-w-md rounded-3xl">
            <div className="relative w-32 h-32 mx-auto mb-6">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-cyan-400 rounded-full blur-xl opacity-50 animate-pulse" />
              <div className="relative bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full w-full h-full flex items-center justify-center">
                <Sparkles className="h-16 w-16 text-white" />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-neutral-800 mb-3">Connect Your Wallet</h2>
            <p className="text-neutral-500 text-lg">Connect your wallet to meet your magical pet companion!</p>
          </Card>
        </div>
      </div>
    );
  }

  if (showPetSelection || !currentPet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-200/30 via-transparent to-transparent pointer-events-none" />
        <Navbar />
        <div className="container mx-auto px-4 py-12">
          <div className="text-center mb-16">
            <div className="inline-block mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full blur-2xl opacity-30 animate-pulse" />
              <Sparkles className="relative h-20 w-20 text-purple-500" />
            </div>
            <h1 className="text-6xl font-bold bg-gradient-to-r from-purple-600 via-pink-500 to-cyan-500 bg-clip-text text-transparent mb-6 animate-gradient">
              Choose Your Pet Companion
            </h1>
            <p className="text-neutral-600 text-xl max-w-3xl mx-auto leading-relaxed">
              Select a magical companion to join you on your SolaMate journey. Each pet has unique abilities to boost your experience and help you grow!
            </p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="relative">
                <div className="absolute inset-0 bg-purple-500 rounded-full blur-xl opacity-30 animate-pulse" />
                <Loader2 className="relative h-16 w-16 animate-spin text-purple-500" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 max-w-7xl mx-auto">
              {PETS.map((pet) => (
                <Card
                  key={pet.id}
                  className="group relative p-6 cursor-pointer ios-transition hover:scale-110 glass-card rounded-3xl border border-purple-200/50 hover:border-purple-400 shadow-lg shadow-purple-500/10 hover:shadow-2xl hover:shadow-purple-500/30 overflow-hidden"
                  onClick={() => handleSelectPet(pet.id)}
                >
                  {/* Animated glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 via-pink-500/0 to-cyan-500/0 group-hover:from-purple-500/10 group-hover:via-pink-500/10 group-hover:to-cyan-500/10 transition-all duration-500" />
                  
                  {/* Sparkle effect on hover */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
                  </div>
                  
                  <div className="relative text-center">
                    <div className="relative w-28 h-28 mx-auto mb-4 transform group-hover:scale-125 group-hover:rotate-6 transition-all duration-500">
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <Image 
                        src={getPetImage(pet.folder, true)} 
                        alt={pet.name} 
                        fill 
                        className="object-contain drop-shadow-2xl relative z-10" 
                        unoptimized 
                      />
                    </div>
                    
                    <h3 className="text-2xl font-bold text-neutral-800 mb-3 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-purple-600 group-hover:to-cyan-600 group-hover:bg-clip-text transition-all duration-300">
                      {pet.name}
                    </h3>
                    
                    <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3 mb-4 border border-neutral-200/50 group-hover:border-purple-400/50 transition-colors duration-300">
                      <p className="text-sm text-neutral-600 leading-relaxed font-medium">{pet.description}</p>
                    </div>
                    
                    <div className="flex items-center justify-center gap-1">
                      {[1, 2, 3].map((i) => (
                        <Star 
                          key={i} 
                          className="h-5 w-5 text-yellow-500 fill-current group-hover:scale-125 transition-transform duration-300" 
                          style={{ transitionDelay: `${i * 50}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const pet = PETS[currentPet - 1];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-200/30 via-transparent to-transparent pointer-events-none" />
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl relative">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-cyan-600 bg-clip-text text-transparent mb-2">
            Your Pet Companion
          </h1>
          <p className="text-neutral-500">Take care of your pet and watch it grow!</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Pet Display */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Pet Card */}
            <Card className="relative overflow-visible glass-card rounded-3xl border border-purple-200/50 shadow-2xl shadow-purple-500/20">
              {/* Background glow */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-cyan-500/5" />
              
              <div className="relative p-8">
                {/* Pet Image with Speech Bubble */}
                <div className="relative w-64 h-64 mx-auto mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-full blur-3xl animate-pulse" />
                  
                  {/* Speech Bubble */}
                  {petGreeting && (
                    <div 
                      onClick={openChatModal}
                      className="absolute -top-12 -right-24 z-20 cursor-pointer group/bubble"
                    >
                      <div className="relative bg-white rounded-3xl px-5 py-4 shadow-[0_8px_30px_rgb(0,0,0,0.08)] max-w-[220px] hover:scale-105 ios-transition hover:shadow-[0_20px_50px_rgb(147,51,234,0.15)]">
                        <p className="text-[15px] text-neutral-800 leading-relaxed font-medium">{petGreeting}</p>
                        
                        <div className="flex items-center gap-2 mt-3">
                          <div className="flex items-center gap-1.5 text-xs text-purple-500 font-medium bg-purple-50 px-3 py-1.5 rounded-full">
                            <MessageCircle className="h-3.5 w-3.5" />
                            <span>Tap to chat</span>
                          </div>
                        </div>
                        
                        {/* Bubble tail */}
                        <div className="absolute -bottom-3 left-10">
                          <div className="w-6 h-6 bg-white rotate-45 rounded-sm shadow-[4px_4px_8px_rgb(0,0,0,0.04)]" />
                        </div>
                      </div>
                    </div>
                  )}
                  <Image 
                    src={getPetImage(pet.folder, (petData?.happiness || 100) >= 50)} 
                    alt={pet.name} 
                    fill 
                    className="object-contain drop-shadow-2xl relative z-10" 
                    unoptimized 
                  />
                </div>

                {/* Pet Info */}
                <div className="text-center mb-6">
                  <h2 className="text-4xl font-bold text-neutral-800 mb-2">{pet.name}</h2>
                  <p className="text-purple-600 text-lg">{pet.description}</p>
                </div>
                
                {/* Level and XP */}
                <div className="mb-6">
                  <div className="flex items-center justify-center gap-4 mb-3">
                    <div className="bg-gradient-to-r from-purple-600 to-cyan-600 rounded-full px-6 py-2 shadow-lg shadow-purple-500/30">
                      <span className="text-2xl font-bold text-white">Level {petData?.level || 1}</span>
                    </div>
                    <span className="text-neutral-600 font-medium">
                      XP: {petData?.xp || 0} / {XP_REQUIRED[(petData?.level || 1) + 1] || '∞'}
                    </span>
                  </div>
                  <div className="relative">
                    <Progress value={xpProgress} className="h-4 bg-neutral-200" />
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-full" />
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-4 border border-red-200/50 shadow-lg shadow-red-500/10">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Heart className="h-6 w-6 text-red-500" />
                      <span className="text-neutral-800 font-bold text-lg">Happiness</span>
                    </div>
                    <Progress value={petData?.happiness || 100} className="h-3 mb-2" />
                    <p className="text-center text-red-600 font-semibold">{petData?.happiness || 100}/100</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 border border-yellow-200/50 shadow-lg shadow-yellow-500/10">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Zap className="h-6 w-6 text-yellow-500" />
                      <span className="text-neutral-800 font-bold text-lg">Energy</span>
                    </div>
                    <Progress value={petData?.energy || 100} className="h-3 mb-2" />
                    <p className="text-center text-yellow-600 font-semibold">{petData?.energy || 100}/100</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={handleFeed}
                disabled={feedCooldown > 0}
                className="h-24 text-xl font-bold bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-neutral-300 disabled:to-neutral-400 shadow-lg shadow-green-500/30 hover:shadow-green-500/50 transition-all duration-300 hover:scale-105 rounded-2xl"
              >
                <div className="flex flex-col items-center">
                  <span className="text-3xl mb-1">🍖</span>
                  <span>Feed Pet</span>
                  {feedCooldown > 0 && (
                    <span className="text-sm font-normal mt-1 opacity-75">
                      {formatTime(feedCooldown)}
                    </span>
                  )}
                </div>
              </Button>
              
              <Button
                onClick={handlePlay}
                disabled={playCooldown > 0}
                className="h-24 text-xl font-bold bg-gradient-to-br from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 disabled:from-neutral-300 disabled:to-neutral-400 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 hover:scale-105 rounded-2xl"
              >
                <div className="flex flex-col items-center">
                  <span className="text-3xl mb-1">🎮</span>
                  <span>Play</span>
                  {playCooldown > 0 && (
                    <span className="text-sm font-normal mt-1 opacity-75">
                      {formatTime(playCooldown)}
                    </span>
                  )}
                </div>
              </Button>
            </div>
          </div>

          {/* Right Column - Tasks & Stats */}
          <div className="space-y-6">
            {/* Daily Tasks */}
            <Card className="glass-card border border-purple-200/50 shadow-xl shadow-purple-500/10 rounded-3xl">
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-gradient-to-br from-purple-600 to-cyan-600 rounded-lg p-2 shadow-lg shadow-purple-500/30">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-neutral-800">Daily Tasks</h3>
                </div>
                
                <div className="space-y-4">
                  {dailyTasks.map((task) => (
                    <div 
                      key={task.id} 
                      className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-neutral-200/50 hover:border-purple-400/50 transition-colors duration-300 shadow-sm"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-neutral-800 font-semibold text-lg">{task.title}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-purple-600 font-bold text-lg">+{task.reward} XP</span>
                          {task.progress >= task.target && (
                            <Trophy className="h-6 w-6 text-yellow-500 animate-bounce" />
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Progress 
                          value={(task.progress / task.target) * 100} 
                          className="flex-1 h-3" 
                        />
                        <span className="text-sm text-neutral-500 font-medium min-w-[60px] text-right">
                          {task.progress}/{task.target}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Statistics */}
            <Card className="glass-card border border-cyan-200/50 shadow-xl shadow-cyan-500/10 rounded-3xl">
              <div className="p-6">
                <h3 className="text-2xl font-bold text-neutral-800 mb-6 flex items-center gap-2">
                  <span>📊</span> Statistics
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4 border border-purple-200/50 text-center shadow-lg shadow-purple-500/10">
                    <p className="text-4xl font-bold text-purple-600 mb-1">{petData?.totalXp || 0}</p>
                    <p className="text-sm text-neutral-600 font-medium">Total XP</p>
                  </div>
                  <div className="bg-gradient-to-br from-cyan-50 to-cyan-100/50 rounded-xl p-4 border border-cyan-200/50 text-center shadow-lg shadow-cyan-500/10">
                    <p className="text-4xl font-bold text-cyan-600 mb-1">{petData?.totalInteractions || 0}</p>
                    <p className="text-sm text-neutral-600 font-medium">Interactions</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Change Pet Button */}
            <Button
              onClick={() => setShowPetSelection(true)}
              variant="outline"
              className="w-full h-14 text-lg font-semibold bg-white/60 backdrop-blur-sm border border-neutral-200 hover:border-purple-400 hover:bg-white/80 text-neutral-700 transition-all duration-300 rounded-2xl shadow-lg"
            >
              <Sparkles className="h-5 w-5 mr-2 text-purple-500" />
              Change Pet
            </Button>
          </div>
        </div>
      </div>

      {/* Loading Overlay */}
      {isSelecting && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="glass-card border border-purple-200/50 p-10 text-center shadow-2xl shadow-purple-500/30 rounded-3xl">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-purple-500 rounded-full blur-xl opacity-30 animate-pulse" />
              <Loader2 className="relative h-16 w-16 animate-spin text-purple-500 mx-auto" />
            </div>
            <p className="text-neutral-800 text-xl font-semibold">Selecting your pet...</p>
            <p className="text-neutral-500 mt-2">Please wait a moment</p>
          </Card>
        </div>
      )}

      {/* Pet Chat Modal */}
      {showChatModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xl flex items-end sm:items-center justify-center z-50">
          {/* iOS style modal */}
          <div className="w-full sm:max-w-md bg-white/95 backdrop-blur-2xl sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden ios-transition animate-in slide-in-from-bottom duration-300">
            {/* iOS Header with blur */}
            <div className="relative">
              {/* Background with pet image blur */}
              <div className="absolute inset-0 overflow-hidden">
                <Image 
                  src={getPetImage(pet.folder, (petData?.happiness || 100) >= 50)} 
                  alt="" 
                  fill 
                  className="object-cover scale-150 blur-2xl opacity-30"
                  unoptimized 
                />
                <div className="absolute inset-0 bg-gradient-to-b from-white/60 to-white/90" />
              </div>
              
              {/* Header content */}
              <div className="relative px-5 pt-4 pb-3">
                {/* iOS drag indicator */}
                <div className="w-10 h-1 bg-neutral-300 rounded-full mx-auto mb-4 sm:hidden" />
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Pet avatar with status ring */}
                    <div className="relative">
                      <div className={`w-14 h-14 rounded-full p-0.5 ${
                        (petData?.happiness || 100) >= 50 
                          ? 'bg-gradient-to-br from-green-400 to-emerald-500' 
                          : 'bg-gradient-to-br from-orange-400 to-red-500'
                      }`}>
                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                          <Image 
                            src={getPetImage(pet.folder, (petData?.happiness || 100) >= 50)} 
                            alt={pet.name} 
                            width={48} 
                            height={48} 
                            className="object-contain"
                            unoptimized 
                          />
                        </div>
                      </div>
                      {/* Online indicator */}
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-white" />
                    </div>
                    
                    <div>
                      <h3 className="text-neutral-900 font-semibold text-lg">{pet.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                          Lv.{petData?.level || 1}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {(petData?.happiness || 100) >= 50 ? '😊 Happy' : '😢 Needs care'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {/* Voice toggle button */}
                    <button 
                      onClick={() => setVoiceEnabled(!voiceEnabled)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        voiceEnabled 
                          ? 'bg-purple-100 text-purple-600' 
                          : 'bg-neutral-200/80 text-neutral-400'
                      }`}
                      title={voiceEnabled ? 'Voice on' : 'Voice off'}
                    >
                      {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    </button>
                    
                    {/* Close button */}
                    <button 
                      onClick={() => setShowChatModal(false)}
                      className="w-8 h-8 rounded-full bg-neutral-200/80 hover:bg-neutral-300/80 flex items-center justify-center transition-colors"
                    >
                      <X className="h-4 w-4 text-neutral-600" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Messages - iOS style */}
            <div className="h-80 overflow-y-auto px-4 py-3 space-y-2 bg-gradient-to-b from-neutral-50 to-white">
              {chatMessages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-end gap-2`}
                >
                  {/* Pet avatar for pet messages */}
                  {msg.role === 'pet' && (
                    <div className="w-7 h-7 rounded-full bg-purple-100 flex-shrink-0 overflow-hidden">
                      <Image 
                        src={getPetImage(pet.folder, true)} 
                        alt="" 
                        width={28} 
                        height={28} 
                        className="object-contain"
                        unoptimized 
                      />
                    </div>
                  )}
                  
                  <div 
                    className={`max-w-[75%] px-4 py-2.5 ${
                      msg.role === 'user' 
                        ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl rounded-br-sm shadow-[0_4px_15px_rgb(147,51,234,0.3)]' 
                        : 'bg-white text-neutral-800 rounded-2xl rounded-bl-sm shadow-[0_2px_10px_rgb(0,0,0,0.06)]'
                    }`}
                  >
                    <p className="text-[15px] leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
              
              {/* Typing indicator */}
              {isChatLoading && (
                <div className="flex justify-start items-end gap-2">
                  <div className="w-7 h-7 rounded-full bg-purple-100 flex-shrink-0 overflow-hidden">
                    <Image 
                      src={getPetImage(pet.folder, true)} 
                      alt="" 
                      width={28} 
                      height={28} 
                      className="object-contain"
                      unoptimized 
                    />
                  </div>
                  <div className="bg-white rounded-2xl rounded-bl-sm shadow-[0_2px_10px_rgb(0,0,0,0.06)] px-4 py-3">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input bar */}
            <div className="px-4 py-3 bg-white/80 backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                    placeholder={`Message ${pet.name}...`}
                    className="w-full px-4 py-2.5 bg-neutral-100 rounded-full text-[15px] placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:bg-white border border-transparent focus:border-purple-200 transition-all"
                    disabled={isChatLoading}
                  />
                </div>
                <button
                  onClick={handleSendChat}
                  disabled={!chatInput.trim() || isChatLoading}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    chatInput.trim() && !isChatLoading
                      ? 'bg-purple-500 hover:bg-purple-600 text-white scale-100'
                      : 'bg-neutral-200 text-neutral-400 scale-95'
                  }`}
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              
              {/* Safe area for iOS */}
              <div className="h-safe-area-inset-bottom" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
