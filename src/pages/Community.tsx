import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Search, Filter, MessageCircle, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { PostCard } from "@/components/community/PostCard";
import { PostComposer } from "@/components/community/PostComposer";
import { PostDetailModal } from "@/components/community/PostDetailModal";
import { MemberProfileModal } from "@/components/community/MemberProfileModal";
import { ReportDialog } from "@/components/community/ReportDialog";
import { CommunityGuidelinesModal } from "@/components/community/CommunityGuidelinesModal";
import { GroupCard } from "@/components/community/GroupCard";
import { MessagesPanel } from "@/components/community/MessagesPanel";
import { CommunityNotifications } from "@/components/community/CommunityNotifications";

import {
  CommunityPost,
  CommunityGroup,
  fetchPosts,
  createPost,
  createComment,
  toggleReaction,
  fetchGroups,
  joinGroup,
  leaveGroup,
} from "@/lib/community";

export default function Community() {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();

  const [client, setClient] = useState<any>(null);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("feed");

  // Modals
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [selectedPost, setSelectedPost] = useState<CommunityPost | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [reportTarget, setReportTarget] = useState<{ type: "post" | "comment" | "user"; id: string } | null>(null);
  const [showMessages, setShowMessages] = useState(false);

  useEffect(() => {
    if (user) {
      if (userRole !== 'admin') {
        loadClientData();
      } else {
        // Admin doesn't have a client profile, but can view data
        loadPosts();
        loadGroups();
      }
    }
  }, [user, userRole]);

  useEffect(() => {
    if (client) {
      loadPosts();
      loadGroups();

      // Check if user needs to accept guidelines
      if (!client.community_terms_accepted_at) {
        setShowGuidelines(true);
      }
    }
  }, [client]);

  const loadClientData = async () => {
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("user_id", user?.id)
      .single();

    setClient(data);
  };

  const loadPosts = async () => {
    setIsLoading(true);
    try {
      const { posts: data } = await fetchPosts({
        clientId: client?.id,
        search: searchQuery || undefined,
      });
      setPosts(data);
    } catch (error) {
      console.error("Failed to load posts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const data = await fetchGroups(client?.id);
      setGroups(data);
    } catch (error) {
      console.error("Failed to load groups:", error);
    }
  };

  const handleCreatePost = async (data: {
    content: string;
    title?: string;
    tags: string[];
    mediaUrls: string[];
    attachments: { name: string; url: string; type: string }[];
  }) => {
    if (!client) return;

    const post = await createPost({
      clientId: client.id,
      displayName: client.display_name || client.name,
      serviceType: client.service_type,
      content: data.content,
      title: data.title,
      tags: data.tags,
      mediaUrls: data.mediaUrls,
      attachments: data.attachments,
    });

    setPosts((prev) => [post, ...prev]);
  };

  const handleLikePost = async (postId: string) => {
    if (!client) return;

    const { added } = await toggleReaction(client.id, "post", postId, "like");

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
            ...p,
            likes_count: added ? p.likes_count + 1 : p.likes_count - 1,
            user_reaction: added ? "like" : null,
          }
          : p
      )
    );
  };

  const handleComment = async (postId: string, content: string) => {
    if (!client) return;

    await createComment({
      postId,
      clientId: client.id,
      displayName: client.display_name || client.name,
      serviceType: client.service_type,
      content,
    });

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p
      )
    );
  };

  const handleJoinGroup = async (groupId: string) => {
    if (!client) return;

    try {
      await joinGroup(groupId, client.id);
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId ? { ...g, is_member: true, member_count: g.member_count + 1 } : g
        )
      );
      toast.success("Joined group!");
    } catch (error: any) {
      toast.error("Failed to join group");
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    if (!client) return;

    try {
      await leaveGroup(groupId, client.id);
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId ? { ...g, is_member: false, member_count: g.member_count - 1 } : g
        )
      );
      toast.success("Left group");
    } catch (error: any) {
      toast.error("Failed to leave group");
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto py-8 text-center">
        <p>Please log in to access the community.</p>
        <Button onClick={() => navigate("/auth")} className="mt-4">
          Log In
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Community</h1>
            </div>
            <div className="flex items-center gap-2">
              {client && (
                <CommunityNotifications
                  clientId={client.id}
                  onNotificationClick={(n) => {
                    if (n.type === "dm") setShowMessages(true);
                    else if (n.payload?.post_id) {
                      const post = posts.find((p) => p.id === n.payload.post_id);
                      if (post) setSelectedPost(post);
                    }
                  }}
                />
              )}
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowMessages(true)}
              >
                <MessageCircle className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="feed">Feed</TabsTrigger>
                <TabsTrigger value="groups">Groups</TabsTrigger>
              </TabsList>

              <TabsContent value="feed" className="space-y-4 mt-4">
                {/* Search */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search posts..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && loadPosts()}
                      className="pl-10"
                    />
                  </div>
                  <Button variant="outline" size="icon">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>

                {/* Post composer */}
                {client && (
                  <PostComposer
                    clientId={client.id}
                    displayName={client.display_name || client.name}
                    serviceType={client.service_type}
                    onPost={handleCreatePost}
                  />
                )}

                {/* Posts feed */}
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : posts.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-muted-foreground">No posts yet. Be the first to share!</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {posts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        currentClientId={client?.id}
                        onLike={handleLikePost}
                        onComment={(postId) => {
                          const post = posts.find((p) => p.id === postId);
                          if (post) setSelectedPost(post);
                        }}
                        onReport={(postId) => setReportTarget({ type: "post", id: postId })}
                        onAuthorClick={setSelectedProfileId}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="groups" className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {groups.map((group) => (
                    <GroupCard
                      key={group.id}
                      group={group}
                      onJoin={handleJoinGroup}
                      onLeave={handleLeaveGroup}
                      onClick={() => { }}
                    />
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {client && showMessages && (
              <MessagesPanel
                clientId={client.id}
                displayName={client.display_name || client.name}
                onClose={() => setShowMessages(false)}
              />
            )}

            {!showMessages && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Popular Tags</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {["weightloss", "healthyeating", "motivation", "recipes", "progress"].map((tag) => (
                    <Button key={tag} variant="secondary" size="sm" onClick={() => setSearchQuery(`#${tag}`)}>
                      #{tag}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {client && (
        <>
          <CommunityGuidelinesModal
            open={showGuidelines}
            onAccept={() => setShowGuidelines(false)}
            clientId={client.id}
          />

          <PostDetailModal
            post={selectedPost}
            open={!!selectedPost}
            onClose={() => setSelectedPost(null)}
            clientId={client.id}
            displayName={client.display_name || client.name}
            serviceType={client.service_type}
            onComment={handleComment}
            onLikeComment={() => { }}
            onAuthorClick={setSelectedProfileId}
          />

          <MemberProfileModal
            clientId={selectedProfileId}
            open={!!selectedProfileId}
            onClose={() => setSelectedProfileId(null)}
            currentClientId={client.id}
            onStartDM={() => setShowMessages(true)}
          />

          {reportTarget && (
            <ReportDialog
              open={!!reportTarget}
              onClose={() => setReportTarget(null)}
              targetType={reportTarget.type}
              targetId={reportTarget.id}
              reporterClientId={client.id}
            />
          )}
        </>
      )}
    </div>
  );
}
