import React, { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useAnalyticsStore } from '@/store/analytics-store';

// Post counts below (Total Posts, Scheduled, per-platform bar chart) are
// real, derived from the actual scheduled_posts data. Views, engagement
// rate, and "top performing content" are NOT shown here: those require a
// real analytics-collection pipeline that calls back to each platform's
// API after a post is published to fetch view/like/comment/share counts
// (see electron/social-platforms/*.ts's getAnalytics() methods, which
// exist and work, but nothing in the app calls them yet on a schedule).
// The previous version of this page showed fabricated totals (254,000
// views, 4.2% engagement, a fixed "Top Performing Content" list of videos
// that were never actually uploaded) that never changed regardless of
// what the user did.
const Analytics: React.FC = () => {
  const { analyticsData, fetchAnalytics } = useAnalyticsStore();

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const platformData = [
    { name: 'Instagram', posts: analyticsData.platformStats.instagram.totalPosts },
    { name: 'TikTok', posts: analyticsData.platformStats.tiktok.totalPosts },
    { name: 'YouTube', posts: analyticsData.platformStats.youtube.totalPosts },
    { name: 'Facebook', posts: analyticsData.platformStats.facebook.totalPosts },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Track your posting activity across all platforms
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Published Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.totalPosts}</div>
            <p className="text-xs text-muted-foreground">
              Across all platforms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData.scheduledPosts}</div>
            <p className="text-xs text-muted-foreground">
              Upcoming posts
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Posts by Platform</CardTitle>
          <CardDescription>Published posts per platform</CardDescription>
        </CardHeader>
        <CardContent>
          {analyticsData.totalPosts === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No published posts yet. Schedule and publish a video to see activity here.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={platformData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="posts" name="Published Posts" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Views &amp; Engagement</CardTitle>
          <CardDescription>Per-post performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            View counts and engagement rates aren't available yet. This requires
            fetching per-post analytics back from each platform after publishing,
            which isn't wired up in this version of ReelShare.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
