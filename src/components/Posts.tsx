
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  Heart, 
  MessageCircle, 
  Share2, 
  Plus, 
  Image as ImageIcon, 
  X, 
  Send,
  MoreVertical,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  Edit2,
  EyeOff,
  Smile,
  Clock,
  Loader2,
  Search,
  ChevronLeft,
  Mic,
  Eye,
  GitBranch,
  Award,
  RefreshCw
} from 'lucide-react';
import { Language, Post, AppView } from '../types';
import { usePosts } from '../context/PostContext';

interface Props {
  user: any;
  language: Language;
  theme: 'light' | 'dark';
  viewMode?: 'all' | 'mine' | 'create' | 'remixes';
  onNavigate?: (view: AppView) => void;
  onSaveToLibrary?: (post: Post) => void;
  onRemix?: (post: Post) => void;
  onEditPost?: (post: Post) => void;
  remixSource?: Post | null;
  editingPost?: Post | null;
  t: any;
}

export const Posts = React.memo(({ user, language, theme, viewMode = 'all', onNavigate, onSaveToLibrary, onRemix, onEditPost, remixSource, editingPost, t }: Props) => {
  const { 
    posts, 
    addPost, 
    updatePost, 
    deletePost, 
    hidePost, 
    hiddenPosts, 
    isLoading: contextLoading,
    loadMore,
    hasMore,
    isFetchingMore,
    fetchPosts
  } = usePosts();

  // Reset and refetch when viewMode or language changes
  useEffect(() => {
    fetchPosts(false, true, viewMode, language);
  }, [viewMode, language]);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPostId, setEditingPostId] = useState<string | null>(editingPost?.id || null);
  const [newPost, setNewPost] = useState({
    english_word: editingPost?.mnemonic_data.english_word || remixSource?.mnemonic_data.english_word || '',
    native_keyword: editingPost?.mnemonic_data.native_keyword || remixSource?.mnemonic_data.native_keyword || '',
    story: editingPost?.mnemonic_data.story || remixSource?.mnemonic_data.story || '',
    image: editingPost?.visuals.user_uploaded_image || remixSource?.visuals.user_uploaded_image || null as string | null
  });

  // Update state when editingPost or remixSource changes
  useEffect(() => {
    if (editingPost) {
      setEditingPostId(editingPost.id);
      setNewPost({
        english_word: editingPost.mnemonic_data.english_word,
        native_keyword: editingPost.mnemonic_data.native_keyword,
        story: editingPost.mnemonic_data.story,
        image: editingPost.visuals.user_uploaded_image
      });
    } else if (remixSource) {
      setEditingPostId(null);
      setNewPost({
        english_word: remixSource.mnemonic_data.english_word,
        native_keyword: remixSource.mnemonic_data.native_keyword,
        story: remixSource.mnemonic_data.story,
        image: remixSource.visuals.user_uploaded_image
      });
    }
  }, [editingPost, remixSource]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Filter posts based on viewMode, search, and language
  const filteredPosts = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();
    return posts.filter(post => {
      // Hide posts that the user has hidden
      if (hiddenPosts.includes(post.id)) return false;

      const matchesSearch = !searchLower || 
        post.mnemonic_data.english_word.toLowerCase().includes(searchLower) ||
        post.mnemonic_data.native_keyword.toLowerCase().includes(searchLower);
      
      // Strict filter by user's language
      const matchesLanguage = post.language === language;

      if (viewMode === 'mine') {
        return post.post_metadata.user_id === user?.id && !post.remix_data && matchesSearch && matchesLanguage;
      }
      if (viewMode === 'remixes') {
        return post.post_metadata.user_id === user?.id && !!post.remix_data && matchesSearch && matchesLanguage;
      }
      return matchesSearch && matchesLanguage;
    });
  }, [posts, hiddenPosts, searchQuery, language, viewMode, user?.id]);

  const leaderboard = React.useMemo(() => {
    const counts: Record<string, { username: string, count: number }> = {};
    posts.forEach(p => {
      if (p.remix_data) {
        const parentId = p.remix_data.parent_post_id;
        const parentUsername = p.remix_data.parent_username;
        if (!counts[parentId]) counts[parentId] = { username: parentUsername, count: 0 };
        counts[parentId].count++;
      }
    });
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [posts]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewPost(prev => ({ ...prev, image: reader.result as string }));
        setIsUploading(false);
      };
      reader.onerror = () => {
        alert(t.failedReadImage || "Failed to read image. Please try again.");
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Upload error:", err);
      alert(t.failedProcessImage || "Failed to process image. Please try again.");
      setIsUploading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.english_word || !newPost.native_keyword || !newPost.story) return;

    if (editingPostId) {
      try {
        await updatePost(editingPostId, (prev) => ({
          ...prev,
          mnemonic_data: {
            english_word: newPost.english_word,
            native_keyword: newPost.native_keyword,
            story: newPost.story
          },
          visuals: {
            ...prev.visuals,
            user_uploaded_image: newPost.image
          }
        }));
        setEditingPostId(null);
        setNewPost({ english_word: '', native_keyword: '', story: '', image: null });
        if (onNavigate) onNavigate(AppView.POSTS);
      } catch (err: any) {
        console.error("Error updating post:", err);
        alert(err.message || t.error);
      }
    } else {
      const post: Post = {
        id: Date.now().toString(),
        post_metadata: {
          username: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Guest',
          timestamp: Date.now(),
          user_id: user?.id || ''
        },
        mnemonic_data: {
          english_word: newPost.english_word,
          native_keyword: newPost.native_keyword,
          story: newPost.story
        },
        visuals: {
          user_uploaded_image: newPost.image,
          ui_style: theme
        },
        language: language,
        engagement: {
          likes: 0,
          dislikes: 0,
          impression_emojis: [
            { emoji: "🧠", count: 0 },
            { emoji: "🔥", count: 0 },
            { emoji: "🌸", count: 0 },
            { emoji: "💡", count: 0 }
          ]
        },
        remix_data: remixSource ? {
          parent_post_id: remixSource.id,
          parent_username: remixSource.post_metadata.username
        } : undefined
      };

      try {
        await addPost(post);
        setNewPost({ english_word: '', native_keyword: '', story: '', image: null });
        if (onNavigate) onNavigate(AppView.POSTS);
      } catch (err: any) {
        console.error("Error creating post:", err);
        alert(err.message || t.error);
      }
    }
  };

  const handleEditPost = (post: Post) => {
    if (onEditPost) {
      onEditPost(post);
    } else {
      setEditingPostId(post.id);
      setNewPost({
        english_word: post.mnemonic_data.english_word,
        native_keyword: post.mnemonic_data.native_keyword,
        story: post.mnemonic_data.story,
        image: post.visuals.user_uploaded_image
      });
      if (onNavigate) onNavigate(AppView.CREATE_POST);
    }
  };

  if (viewMode === 'create') {
    if (!user) {
      return (
        <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-8">
          <div className="w-24 h-24 bg-indigo-100 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mx-auto text-indigo-600">
            <Award size={48} />
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-black text-gray-900 dark:text-white">{t.loginRequired}</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto font-medium">
              {t.joinCommunity}
            </p>
          </div>
          <button 
            onClick={() => onNavigate?.(AppView.AUTH)}
            className="px-12 py-4 bg-indigo-600 text-white rounded-full font-black text-lg shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-95"
          >
            {t.signIn || 'Sign In'}
          </button>
        </div>
      );
    }

    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => onNavigate?.(AppView.POSTS)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <ChevronLeft size={24} className="text-gray-600 dark:text-gray-400" />
          </button>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            {editingPostId ? t.edit : t.create}
          </h2>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="space-y-3">
            <input 
              type="text"
              placeholder={t.placeholderWord}
              value={newPost.english_word}
              onChange={(e) => setNewPost({...newPost, english_word: e.target.value})}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white font-bold"
            />
            <input 
              type="text"
              placeholder={t.placeholderKeyword}
              value={newPost.native_keyword}
              onChange={(e) => setNewPost({...newPost, native_keyword: e.target.value})}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white font-bold"
            />
            <textarea 
              placeholder={t.placeholderStory}
              value={newPost.story}
              onChange={(e) => setNewPost({...newPost, story: e.target.value})}
              rows={5}
              className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 text-gray-900 dark:text-white font-medium resize-none"
            />
          </div>

          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/30">
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium italic leading-relaxed">
              {t.researchNote}
            </p>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="p-2 text-gray-400 hover:text-indigo-600 transition-colors disabled:opacity-50"
              >
                {isUploading ? <Loader2 className="animate-spin" size={24} /> : <ImageIcon size={24} />}
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                className="hidden" 
                accept="image/*" 
              />
              {newPost.image && (
                <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-gray-200">
                  <img src={newPost.image} className="w-full h-full object-cover" />
                  <button 
                    onClick={() => setNewPost(prev => ({ ...prev, image: null }))}
                    className="absolute top-0 right-0 bg-black/50 text-white p-0.5 rounded-bl-lg"
                  >
                    <X size={10} />
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleCreatePost}
                disabled={!newPost.english_word || !newPost.native_keyword || !newPost.story}
                className="px-12 py-3 bg-indigo-600 text-white rounded-full font-bold text-base shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95"
              >
                {editingPostId ? (t.save || 'Save') : t.post}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20 px-4 sm:px-0 pt-4">
      {/* Search Bar Redesign */}
      <div className="relative flex items-center bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-full p-1.5 shadow-lg group focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
        <div className="flex-1 flex items-center px-4">
          <input 
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none outline-none focus:ring-0 text-gray-900 dark:text-white font-medium placeholder:text-gray-400"
          />
        </div>
        <div className="flex items-center gap-1">
          <button className="p-3 text-gray-400 hover:text-indigo-500 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-full transition-all">
            <Mic size={20} />
          </button>
          <button className="p-3 bg-indigo-600 text-white rounded-full shadow-lg shadow-indigo-500/40 hover:bg-indigo-700 transition-all active:scale-90">
            <Search size={20} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
          {viewMode === 'mine' ? t.yourPosts : viewMode === 'remixes' ? t.myRemixes : t.title}
        </h2>
        <button 
          onClick={() => onNavigate?.(AppView.CREATE_POST)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-full font-bold text-sm shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all active:scale-95"
        >
          <Plus size={18} />
          {t.create}
        </button>
      </div>

      <div className="space-y-4">
        {contextLoading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 font-bold animate-pulse">{t.loading}</p>
          </div>
        ) : filteredPosts.length > 0 ? (
          filteredPosts.map((post) => (
            <PostCard 
              key={post.id} 
              post={post} 
              user={user} 
              theme={theme} 
              t={t} 
              language={language}
              onDelete={() => {
                if (window.confirm(t.confirmDelete)) {
                  deletePost(post.id);
                }
              }}
              onEdit={() => handleEditPost(post)}
              onHide={() => hidePost(post.id)}
              onSaveToLibrary={onSaveToLibrary}
              onRemix={onRemix}
            />
          ))
        ) : (
          <div className="text-center py-20 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl">
            <MessageSquare size={48} className="mx-auto text-gray-200 dark:text-slate-800 mb-4" />
            <p className="text-gray-500 font-bold">{t.empty}</p>
          </div>
        )}

        {hasMore && filteredPosts.length > 0 && (
          <div className="flex justify-center pt-4 pb-8">
            <button
              onClick={loadMore}
              disabled={isFetchingMore}
              className="px-8 py-3 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 text-gray-900 dark:text-white rounded-2xl font-bold shadow-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isFetchingMore ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                  {t.loading}
                </>
              ) : (
                t.loadMore
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

const PostCard = React.memo(({ post, user, theme, t, language, onDelete, onEdit, onHide, onSaveToLibrary, onRemix }: { 
  post: Post, 
  user: any, 
  theme: string, 
  t: any,
  language: Language,
  onDelete?: () => void,
  onEdit?: () => void,
  onHide?: () => void,
  onSaveToLibrary?: (post: Post) => void,
  onRemix?: (post: Post) => void
}) => {
  const { toggleLike, toggleDislike, toggleEmoji } = usePosts();
  const [isImageRevealed, setIsImageRevealed] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleLike = () => {
    toggleLike(post.id, user?.id || 'guest');
  };

  const handleDislike = () => {
    toggleDislike(post.id, user?.id || 'guest');
  };

  const handleEmoji = (emoji: string) => {
    toggleEmoji(post.id, user?.id || 'guest', emoji);
  };

  const isOwner = user?.id === post.post_metadata.user_id;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow relative"
    >
      <div className="p-4 sm:p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-sm overflow-hidden">
              {post.post_metadata.avatar_url ? (
                <img src={post.post_metadata.avatar_url} alt={post.post_metadata.username} className="w-full h-full object-cover" />
              ) : (
                post.post_metadata.username[0].toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h4 className="font-black text-gray-900 dark:text-white text-sm leading-none truncate max-w-[120px] sm:max-w-none">
                  {post.post_metadata.username}
                </h4>
                {post.remix_data && (
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[9px] font-black border border-indigo-100 dark:border-indigo-800/50 min-w-0">
                    <RefreshCw size={8} className="shrink-0" />
                    <span className="truncate">
                      {t.remixedFrom} @{post.remix_data.parent_username}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold mt-1">
                <Clock size={10} />
                {new Date(post.post_metadata.timestamp).toLocaleDateString()}
              </div>
            </div>
          </div>

          <div className="relative shrink-0">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <MoreVertical size={20} />
            </button>

            <AnimatePresence>
              {showMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowMenu(false)}
                  />
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-2xl z-20 py-2 overflow-hidden"
                  >
                    {onSaveToLibrary && !isOwner && (
                      <button 
                        onClick={() => { onSaveToLibrary(post); setShowMenu(false); }}
                        className="w-full px-4 py-2.5 text-left text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center gap-3 border-b border-gray-50 dark:border-slate-700/50"
                      >
                        <Plus size={16} />
                        {t.saveToLibrary}
                      </button>
                    )}
                    {isOwner ? (
                      <>
                        <button 
                          onClick={() => { onEdit?.(); setShowMenu(false); }}
                          className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-3"
                        >
                          <Edit2 size={16} />
                          {t.edit}
                        </button>
                        <button 
                          onClick={() => { onDelete?.(); setShowMenu(false); }}
                          className="w-full px-4 py-2.5 text-left text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3"
                        >
                          <Trash2 size={16} />
                          {t.delete}
                        </button>
                      </>
                    ) : (
                      <button 
                        onClick={() => { onHide?.(); setShowMenu(false); }}
                        className="w-full px-4 py-2.5 text-left text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-3"
                      >
                        <EyeOff size={16} />
                        {t.hide}
                      </button>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Mnemonic Content */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
              {post.mnemonic_data.english_word}
            </span>
            <span className="text-lg sm:text-xl font-black text-gray-400 dark:text-slate-600 italic">
              ≈ {post.mnemonic_data.native_keyword}
            </span>
          </div>
          
          <p className="text-gray-700 dark:text-gray-300 font-medium leading-relaxed text-sm sm:text-base">
            {post.mnemonic_data.story}
          </p>
        </div>

        {/* Emoji Impressions */}
        <div className="grid grid-cols-4 gap-2 pt-1">
          {post.engagement.impression_emojis.slice(0, 4).map((e, idx) => {
            const isSelected = post.engagement.user_emoji === e.emoji;
            return (
              <button 
                key={idx}
                onClick={() => handleEmoji(e.emoji)}
                className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl transition-all text-sm font-bold border ${
                  isSelected 
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400' 
                    : 'bg-gray-50 dark:bg-slate-800/50 border-transparent text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className={isSelected ? '' : 'grayscale'}>{e.emoji}</span>
                <span>{e.count}</span>
              </button>
            );
          })}
        </div>

        {/* Image if exists */}
        {post.visuals.user_uploaded_image && (
          <div className="relative rounded-2xl overflow-hidden border border-gray-100 dark:border-slate-800 group">
            <img 
              src={post.visuals.user_uploaded_image} 
              alt={post.mnemonic_data.english_word}
              className={`w-full h-auto object-cover max-h-80 transition-all duration-700 ${!isImageRevealed ? 'blur-3xl scale-110' : 'blur-0 scale-100'}`}
              referrerPolicy="no-referrer"
            />
            
            {!isImageRevealed && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center space-y-3">
                <p className="text-white text-[10px] font-medium leading-relaxed drop-shadow-lg max-w-xs">
                  {t.researchNote}
                </p>
                <button 
                  onClick={() => setIsImageRevealed(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-xl font-black text-xs shadow-xl hover:bg-indigo-50 transition-all active:scale-95"
                >
                  <Eye size={14} />
                  <span>{t.revealImage}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Engagement */}
        <div className="pt-2 flex items-center justify-between border-t border-gray-50 dark:border-slate-800/50">
          <div className="flex items-center gap-6">
            <button 
              onClick={handleLike}
              className={`flex items-center gap-1.5 text-sm font-bold transition-colors ${post.engagement.user_liked ? 'text-red-500' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Heart size={18} fill={post.engagement.user_liked ? "currentColor" : "none"} />
              {post.engagement.likes}
            </button>
            <button 
              onClick={handleDislike}
              className={`flex items-center gap-1.5 text-sm font-bold transition-colors ${post.engagement.user_disliked ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <ThumbsDown size={18} fill={post.engagement.user_disliked ? "currentColor" : "none"} />
              {post.engagement.dislikes}
            </button>
            {onRemix && !isOwner && (
              <button 
                onClick={() => onRemix(post)}
                className="flex items-center gap-1.5 text-sm font-bold text-gray-400 hover:text-indigo-600 transition-colors group"
                title={t.remix}
              >
                <GitBranch size={18} className="group-hover:rotate-12 transition-transform" />
                <span className="hidden sm:inline">{t.remix}</span>
              </button>
            )}
          </div>

          {(post as any).is_updated && (
            <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-800">
              <Edit2 size={10} />
              <span>{t.edited}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});
