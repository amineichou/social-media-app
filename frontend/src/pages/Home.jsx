import React, { useEffect, useState } from "react";
import PostCard from "../components/PostCard.jsx";
import { request } from "../utils/api.js";
import { authFetchOptions, getFirstName, getUsername } from "../utils/auth.js";
import Dashboard from "../components/Dashboard.jsx";
import { useSocket } from "../contexts/SocketContext.jsx";
import { useAlert } from "../components/Alert";
import { FaFireAlt } from 'react-icons/fa'
import { Link } from 'react-router-dom';

export default function Home() {
  const [greeting, setGreeting] = useState('');
  const { posts: socketPosts, updatePosts, isConnected } = useSocket();
  const [posts, setPosts] = useState([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { showAlert } = useAlert();

  const firstName = getFirstName();
  const username = getUsername();

  // Dynamic greeting based on time
  useEffect(() => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) {
      setGreeting('Good Morning')
    } else if (hour >= 12 && hour < 17) {
      setGreeting('Good Afternoon')
    } else if (hour >= 17 && hour < 21) {
      setGreeting('Good Evening')
    } else {
      setGreeting('Good Night')
    }
    document.title = "Home - Jupiter";
  }, [])


  async function fetchPosts(pageNum = 1, reset = false) {
    if (loading && !reset) return;

    setLoading(true);
    try {
      const data = await request(`/posts?page=${pageNum}&limit=5`, authFetchOptions({
        method: "GET"
      }));

      // Handle both paginated and non-paginated response formats
      let postsData = [];
      let hasMoreData = false;

      if (data.posts && Array.isArray(data.posts)) {
        // Paginated response
        postsData = data.posts;
        hasMoreData = data.hasMore || false;
      } else if (Array.isArray(data)) {
        // Non-paginated response (backward compatibility)
        postsData = data;
        hasMoreData = data.length >= 5; // Assume more if we got full page
      }

      if (reset) {
        setPosts(postsData);
        updatePosts(postsData);
      } else {
        setPosts(prev => [...prev, ...postsData]);
      }

      setHasMore(hasMoreData);
    } catch (error) {
      console.error("Error fetching posts:", error);
      if (reset) {
        setPosts([]); // Set empty array on error for initial load
      }
      showAlert('Failed to load posts', 'error');
    }
    setLoading(false);
    setIsInitialLoad(false);
  }

  const loadMorePosts = () => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPosts(nextPage, false);
    }
  };

  // Infinite scroll handler
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + document.documentElement.scrollTop !== document.documentElement.offsetHeight || loading) {
        return;
      }
      loadMorePosts();
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loading, page]);

  // Merge socket posts with fetched posts
  useEffect(() => {
    if (!isInitialLoad && socketPosts.length > 0) {
      const allPosts = [...socketPosts, ...posts];
      const uniquePosts = allPosts.filter((post, index, self) =>
        index === self.findIndex(p => p.id === post.id)
      );
      // Sort by creation date
      uniquePosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setPosts(uniquePosts);
    }
  }, [socketPosts, isInitialLoad]);

  async function handleDeletePost(postId) {
    try {
      await request(`/posts/${postId}`, authFetchOptions({
        method: "DELETE"
      }));
      // Refresh posts after successful deletion
      setPage(1);
      fetchPosts(1, true);
    } catch (error) {
      console.error('Error deleting post:', error);
      showAlert('Failed to delete post', 'error');
    }
  }

  const handlePostCreated = () => {
    // Reset to first page and refresh feed when new post is created
    setPage(1);
    fetchPosts(1, true);
  };

  useEffect(function () {
    fetchPosts(1, true);
  }, []);

  return (
    <div className="min-h-screen w-full flex justify-start items-start md:p-8 gap-8">
      {/* Clean Header */}
      <div className="w-full mx-auto">
        {/* greeting */}
        <div className="mb-12 mt-6">
          <h1 className="text-3xl font-light text-gray-900 dark:text-white mb-2">{greeting}, {firstName || "User"}!</h1>
          <div className="flex items-center space-x-2 overflow-x-auto mb-4">
            <FaFireAlt className="mr-2 text-red-500" />
            <p className="text-black dark:text-white" >Trending</p>
            {[
              { topic: 'Harvey Specter', posts: '3 post' },
              { topic: 'amine ichou', posts: '2 posts' },
              { topic: 'life', posts: 'N/A' },
              { topic: 'hitler', posts: 'N/A' },
              { topic: 'alert', posts: 'N/A' }
            ].map((item, index) => (
              <Link to={`/posts?topic=${encodeURIComponent(item.topic)}`}
                key={item.topic}
                className="text-xm rounded-lg font-medium bg-gray-300 p-1 dark:bg-gray-800  text-gray-900 dark:text-white"
              >
                <span className="">{item.topic}</span>
              </Link>
            ))}

          </div>
        </div>
        {/* Posts Feed */}
        <div className="space-y-6">
          {/* Posts Feed */}
          <div>
            <div className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Feed</div>
            <hr className="border-t border-gray-300 dark:border-gray-700" />
          </div>
          <div className="space-y-4">
            {!Array.isArray(posts) ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
                Error: Posts data is invalid. Please refresh the page.
              </div>
            ) : posts.length === 0 && !loading && !isInitialLoad ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No posts yet</h3>
                <p className="text-gray-600 dark:text-gray-400">Start sharing your thoughts with the world!</p>
              </div>
            ) : (
              <>
                {posts.map((post) => (
                  <div key={post.id} className="">
                    <PostCard post={post} onDelete={() => handleDeletePost(post.id)} />
                  </div>
                ))}

                {/* Loading indicator */}
                {loading && (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  </div>
                )}

                {/* Load more button - fallback */}
                {!loading && hasMore && posts.length > 0 && (
                  <div className="flex justify-center py-6">
                    <button
                      onClick={loadMorePosts}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Load More Posts
                    </button>
                  </div>
                )}

                {/* End of feed indicator */}
                {!hasMore && posts.length > 0 && (
                  <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                    You've reached the end of your feed
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      {/* Dashboard */}
      <Dashboard onPostCreated={handlePostCreated} />
    </div>
  );
}
