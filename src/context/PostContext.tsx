import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Post, Language } from '../types';
import { supabase } from '../supabaseClient';

interface PostContextType {
  posts: Post[];
  addPost: (post: Partial<Post>) => Promise<void>;
  deletePost: (postId: string) => Promise<void>;
  hidePost: (postId: string) => void;
  updatePost: (postId: string, updater: (post: Post) => Post) => Promise<void>;
  toggleLike: (postId: string, userId: string) => Promise<void>;
  toggleDislike: (postId: string, userId: string) => Promise<void>;
  toggleEmoji: (postId: string, userId: string, emoji: string) => Promise<void>;
  isLoading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  hiddenPosts: string[];
  fetchPosts: (silent?: boolean, reset?: boolean, viewMode?: string, language?: Language) => Promise<void>;
  loadMore: () => Promise<void>;
}

const PostContext = createContext<PostContextType | undefined>(undefined);

const POSTS_PER_PAGE = 20;

export const PostProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [hiddenPosts, setHiddenPosts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [lastViewMode, setLastViewMode] = useState('all');
  const [lastLanguage, setLastLanguage] = useState(Language.UZBEK);
  const cache = React.useRef<Record<string, { posts: Post[], hasMore: boolean, page: number }>>({});

  const fetchPosts = useCallback(async (silent: boolean = false, reset: boolean = false, viewMode: string = 'all', language: Language = Language.UZBEK) => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    const cacheKey = `${viewMode}-${language}-${user?.id || 'guest'}`;

    if (reset) {
      // If we have a cache, set it immediately but still fetch in the background
      if (cache.current[cacheKey]) {
        setPosts(cache.current[cacheKey].posts);
        setHasMore(cache.current[cacheKey].hasMore);
        setPage(0);
        setIsLoading(false);
        silent = true; // Make the subsequent fetch silent
      }
      setPage(0);
      setHasMore(true);
      setLastViewMode(viewMode);
      setLastLanguage(language);
    } else if (cache.current[cacheKey] && page === 0 && !silent) {
      setPosts(cache.current[cacheKey].posts);
      setHasMore(cache.current[cacheKey].hasMore);
      setPage(cache.current[cacheKey].page);
      setIsLoading(false);
      return;
    }
    
    const currentPage = reset ? 0 : page;
    if (!silent && currentPage === 0) setIsLoading(true);
    
    try {
      const from = currentPage * POSTS_PER_PAGE;
      const to = from + POSTS_PER_PAGE - 1;

      // OPTIMIZATION: We fetch counts from the engagement JSONB field 
      // and only fetch the current user's reactions for these posts.
      let query = supabase
        .from('posts')
        .select(`
          id,
          created_at,
          user_id,
          mnemonic_id,
          language,
          parent_post_id,
          mnemonic_data,
          visuals,
          engagement,
          is_updated,
          profiles!user_id (username, full_name, avatar_url),
          mnemonics:mnemonic_id (word, keyword, story, image_url, data),
          parent:parent_post_id (
            user_id,
            profiles:user_id (username, full_name, avatar_url)
          )
        `)
        .eq('language', language)
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data: postsData, error: postsError } = await query;

      if (postsError) {
        console.error('Detailed Supabase Fetch Error:', postsError);
        throw postsError;
      }

      // Fetch current user's reactions for these posts if logged in
      let userReactions: any[] = [];
      if (user && postsData && postsData.length > 0) {
        const postIds = postsData.map(p => p.id);
        const { data: reactionsData } = await supabase
          .from('reactions')
          .select('post_id, reaction_type')
          .eq('user_id', user.id)
          .in('post_id', postIds);
        
        if (reactionsData) {
          userReactions = reactionsData;
        }
      }

      const mappedPosts: Post[] = postsData.map((p: any) => {
        const userReaction = userReactions.find(r => r.post_id === p.id);
        const user_liked = userReaction?.reaction_type === 'like';
        const user_disliked = userReaction?.reaction_type === 'dislike';
        const user_emoji = !['like', 'dislike'].includes(userReaction?.reaction_type) ? userReaction?.reaction_type : undefined;

        // Default emojis to ensure they always exist in the UI
        const defaultEmojis = [
          { emoji: "🧠", count: 0 },
          { emoji: "🔥", count: 0 },
          { emoji: "🌸", count: 0 },
          { emoji: "💡", count: 0 }
        ];

        // Merge with counts from the engagement field
        const serverEngagement = p.engagement || {};
        const serverEmojis = serverEngagement.impression_emojis || [];
        
        const impression_emojis = defaultEmojis.map(de => {
          const se = serverEmojis.find((e: any) => e.emoji === de.emoji);
          return se ? { ...de, count: se.count || 0 } : de;
        });

        const engagement = {
          likes: serverEngagement.likes || 0,
          dislikes: serverEngagement.dislikes || 0,
          impression_emojis,
          user_liked,
          user_disliked,
          user_emoji
        };

        return {
          id: p.id,
          post_metadata: {
            username: p.profiles?.username || p.profiles?.full_name || 'Unknown',
            avatar_url: p.profiles?.avatar_url,
            timestamp: new Date(p.created_at).getTime(),
            user_id: p.user_id
          },
          mnemonic_data: {
            english_word: p.mnemonic_data?.english_word || p.mnemonics?.word || '',
            native_keyword: p.mnemonic_data?.native_keyword || p.mnemonics?.keyword || p.mnemonics?.data?.phoneticLink || '',
            story: p.mnemonic_data?.story || p.mnemonics?.story || p.mnemonics?.data?.imagination || ''
          },
          visuals: {
            user_uploaded_image: p.visuals?.user_uploaded_image !== undefined ? p.visuals.user_uploaded_image : (p.mnemonics?.image_url || null),
            ui_style: p.visuals?.ui_style || 'light'
          },
          language: p.language as Language,
          engagement,
          remix_data: p.parent_post_id ? {
            parent_post_id: p.parent_post_id,
            parent_username: p.parent?.profiles?.username || p.parent?.profiles?.full_name || 'Original'
          } : undefined,
          is_updated: p.is_updated
        } as any;
      });

      setPosts(prev => {
        const newPosts = (reset || currentPage === 0) ? mappedPosts : [...prev, ...mappedPosts];
        // Update cache
        cache.current[cacheKey] = {
          posts: newPosts,
          hasMore: mappedPosts.length === POSTS_PER_PAGE,
          page: currentPage
        };
        return newPosts;
      });
      setHasMore(mappedPosts.length === POSTS_PER_PAGE);
    } catch (err) {
      console.error('Error fetching posts:', err);
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  }, [page]);

  const loadMore = useCallback(async () => {
    if (isFetchingMore || !hasMore) return;
    setIsFetchingMore(true);
    setPage(prev => prev + 1);
  }, [isFetchingMore, hasMore]);

  // Handle page changes for loading more
  useEffect(() => {
    if (page > 0) {
      fetchPosts(true, false, lastViewMode, lastLanguage);
    }
  }, [page, fetchPosts, lastViewMode, lastLanguage]);

  useEffect(() => {
    fetchPosts();
    
    const savedHidden = localStorage.getItem('mnemonix_hidden_posts');
    if (savedHidden) {
      try {
        setHiddenPosts(JSON.parse(savedHidden));
      } catch (e) {
        console.error('Error parsing hidden posts:', e);
      }
    }
  }, []);

  const addPost = useCallback(async (postData: Partial<Post>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Iltimos, post yaratish uchun tizimga kiring.");

    try {
      // 1. Ensure mnemonic exists or create it
      let mnemonicId;
      const { data: existingMnemonic } = await supabase
        .from('mnemonics')
        .select('id')
        .eq('word', postData.mnemonic_data?.english_word)
        .eq('language', postData.language)
        .maybeSingle();

      if (existingMnemonic) {
        mnemonicId = existingMnemonic.id;
      } else {
        const mnemonicData = {
          word: postData.mnemonic_data?.english_word || '',
          transcription: '',
          meaning: postData.mnemonic_data?.native_keyword || '',
          morphology: '',
          imagination: postData.mnemonic_data?.story || '',
          phoneticLink: postData.mnemonic_data?.native_keyword || '',
          connectorSentence: '',
          examples: [],
          synonyms: [],
          imagePrompt: '',
          level: 'Intermediate'
        };

        const { data: newMnemonic, error: mError } = await supabase
          .from('mnemonics')
          .insert({
            word: postData.mnemonic_data?.english_word,
            data: mnemonicData,
            image_url: postData.visuals?.user_uploaded_image,
            language: postData.language,
            keyword: postData.mnemonic_data?.native_keyword,
            story: postData.mnemonic_data?.story
          })
          .select()
          .single();

        if (mError) {
          if (mError.code === '23505') {
            const { data: existing } = await supabase
              .from('mnemonics')
              .select('id')
              .eq('word', postData.mnemonic_data?.english_word)
              .eq('language', postData.language)
              .single();
            if (existing) {
              mnemonicId = existing.id;
            } else {
              throw mError;
            }
          } else {
            throw mError;
          }
        } else {
          mnemonicId = newMnemonic.id;
        }
      }

      // 2. Create post
      const { error: pError } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          mnemonic_id: mnemonicId,
          language: postData.language,
          parent_post_id: postData.remix_data?.parent_post_id,
          mnemonic_data: {
            english_word: postData.mnemonic_data?.english_word,
            native_keyword: postData.mnemonic_data?.native_keyword,
            story: postData.mnemonic_data?.story
          },
          visuals: {
            user_uploaded_image: postData.visuals?.user_uploaded_image,
            ui_style: 'light'
          },
          engagement: {
            likes: 0,
            dislikes: 0,
            impression_emojis: [
              { emoji: "🧠", count: 0 },
              { emoji: "🔥", count: 0 },
              { emoji: "🌸", count: 0 },
              { emoji: "💡", count: 0 }
            ]
          }
        });

      if (pError) {
        console.error('Detailed Supabase Insert Error:', pError);
        throw pError;
      }
      
      await fetchPosts(true);
    } catch (err) {
      console.error('Error adding post:', err);
    }
  }, [fetchPosts]);

  const deletePost = useCallback(async (postId: string) => {
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postId);
      if (error) throw error;
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) {
      console.error('Error deleting post:', err);
    }
  }, []);

  const hidePost = useCallback((postId: string) => {
    setHiddenPosts(prev => {
      const newHidden = [...prev, postId];
      localStorage.setItem('mnemonix_hidden_posts', JSON.stringify(newHidden));
      return newHidden;
    });
  }, []);

  const toggleLike = useCallback(async (postId: string, userId: string) => {
    if (!userId || userId === 'guest') {
      console.warn("User not logged in for reaction");
      return;
    }

    // Optimistic Update
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const wasLiked = p.engagement.user_liked;
      const wasDisliked = p.engagement.user_disliked;
      return {
        ...p,
        engagement: {
          ...p.engagement,
          likes: wasLiked ? p.engagement.likes - 1 : p.engagement.likes + 1,
          dislikes: wasDisliked ? p.engagement.dislikes - 1 : p.engagement.dislikes,
          user_liked: !wasLiked,
          user_disliked: false
        }
      };
    }));

    try {
      // Check if reaction exists
      const { data: existing } = await supabase
        .from('reactions')
        .select()
        .eq('post_id', postId)
        .eq('user_id', userId)
        .eq('reaction_type', 'like')
        .maybeSingle();

      if (existing) {
        await supabase.from('reactions').delete().eq('id', existing.id);
      } else {
        // Remove dislike if exists
        await supabase.from('reactions').delete().eq('post_id', postId).eq('user_id', userId).eq('reaction_type', 'dislike');
        await supabase.from('reactions').insert({ post_id: postId, user_id: userId, reaction_type: 'like' });
      }
      // Silent refresh to ensure sync
      await fetchPosts(true);
    } catch (err) {
      console.error('Error toggling like:', err);
      await fetchPosts(true); // Rollback/Sync
    }
  }, [fetchPosts]);

  const toggleDislike = useCallback(async (postId: string, userId: string) => {
    if (!userId || userId === 'guest') {
      console.warn("User not logged in for reaction");
      return;
    }

    // Optimistic Update
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const wasDisliked = p.engagement.user_disliked;
      const wasLiked = p.engagement.user_liked;
      return {
        ...p,
        engagement: {
          ...p.engagement,
          dislikes: wasDisliked ? p.engagement.dislikes - 1 : p.engagement.dislikes + 1,
          likes: wasLiked ? p.engagement.likes - 1 : p.engagement.likes,
          user_disliked: !wasDisliked,
          user_liked: false
        }
      };
    }));

    try {
      const { data: existing } = await supabase
        .from('reactions')
        .select()
        .eq('post_id', postId)
        .eq('user_id', userId)
        .eq('reaction_type', 'dislike')
        .maybeSingle();

      if (existing) {
        await supabase.from('reactions').delete().eq('id', existing.id);
      } else {
        await supabase.from('reactions').delete().eq('post_id', postId).eq('user_id', userId).eq('reaction_type', 'like');
        await supabase.from('reactions').insert({ post_id: postId, user_id: userId, reaction_type: 'dislike' });
      }
      await fetchPosts(true);
    } catch (err) {
      console.error('Error toggling dislike:', err);
      await fetchPosts(true);
    }
  }, [fetchPosts]);

  const toggleEmoji = useCallback(async (postId: string, userId: string, emoji: string) => {
    if (!userId || userId === 'guest') {
      console.warn("User not logged in for reaction");
      return;
    }

    // Optimistic Update
    setPosts(prev => prev.map(p => {
      if (p.id !== postId) return p;
      const wasSelected = p.engagement.user_emoji === emoji;
      const prevEmoji = p.engagement.user_emoji;
      
      return {
        ...p,
        engagement: {
          ...p.engagement,
          impression_emojis: p.engagement.impression_emojis.map(e => {
            if (e.emoji === emoji) {
              return { ...e, count: wasSelected ? e.count - 1 : e.count + 1 };
            }
            if (e.emoji === prevEmoji) {
              return { ...e, count: e.count - 1 };
            }
            return e;
          }),
          user_emoji: wasSelected ? undefined : emoji
        }
      };
    }));

    try {
      const { data: existing } = await supabase
        .from('reactions')
        .select()
        .eq('post_id', postId)
        .eq('user_id', userId)
        .eq('reaction_type', emoji)
        .maybeSingle();

      if (existing) {
        await supabase.from('reactions').delete().eq('id', existing.id);
      } else {
        // Remove other emojis first
        const { data: otherEmojis } = await supabase
          .from('reactions')
          .select('reaction_type')
          .eq('post_id', postId)
          .eq('user_id', userId);
        
        if (otherEmojis) {
          const emojiTypes = otherEmojis.map((r: any) => r.reaction_type).filter((t: any) => !['like', 'dislike'].includes(t));
          if (emojiTypes.length > 0) {
            await supabase.from('reactions').delete().eq('post_id', postId).eq('user_id', userId).in('reaction_type', emojiTypes);
          }
        }

        await supabase.from('reactions').insert({ post_id: postId, user_id: userId, reaction_type: emoji });
      }
      await fetchPosts(true);
    } catch (err) {
      console.error('Error toggling emoji:', err);
      await fetchPosts(true);
    }
  }, [fetchPosts]);

  const updatePost = useCallback(async (postId: string, updater: (post: Post) => Post) => {
    try {
      setPosts(prev => {
        const post = prev.find(p => p.id === postId);
        if (!post) return prev;
        
        const updatedPost = updater(post);
        
        // Optimistic update
        const newPosts = prev.map(p => p.id === postId ? { ...updatedPost, is_updated: true } : p);
        
        // Async update
        supabase
          .from('posts')
          .update({
            mnemonic_data: updatedPost.mnemonic_data,
            visuals: updatedPost.visuals,
            is_updated: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', postId)
          .then(({ error }) => {
            if (error) {
              console.error('Error updating post:', error);
              fetchPosts(true);
            }
          });

        return newPosts;
      });
    } catch (err) {
      console.error('Error updating post:', err);
      throw err;
    }
  }, [fetchPosts]);

  const contextValue = React.useMemo(() => ({ 
    posts, 
    addPost, 
    deletePost,
    hidePost,
    updatePost, 
    toggleLike, 
    toggleDislike,
    toggleEmoji, 
    isLoading,
    isFetchingMore,
    hasMore,
    hiddenPosts,
    fetchPosts,
    loadMore
  }), [
    posts, 
    isLoading, 
    isFetchingMore, 
    hasMore, 
    hiddenPosts, 
    fetchPosts, 
    loadMore
  ]);

  return (
    <PostContext.Provider value={contextValue}>
      {children}
    </PostContext.Provider>
  );
};


export const usePosts = () => {
  const context = useContext(PostContext);
  if (context === undefined) {
    throw new Error('usePosts must be used within a PostProvider');
  }
  return context;
};

