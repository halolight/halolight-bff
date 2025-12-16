import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';

/**
 * Dashboard router
 * Handles dashboard statistics, charts, and overview data
 */
export const dashboardRouter = router({
  /**
   * Get dashboard statistics
   */
  getStats: protectedProcedure.query(async () => {
    // TODO: Replace with actual database aggregations
    const mockStats = {
      totalUsers: Math.floor(Math.random() * 50000) + 1000,
      totalRevenue: Math.floor(Math.random() * 9999999) + 100000,
      totalOrders: Math.floor(Math.random() * 10000) + 500,
      conversionRate: parseFloat((Math.random() * 9 + 1).toFixed(2)),
      userGrowth: parseFloat((Math.random() * 25 - 5).toFixed(2)),
      revenueGrowth: parseFloat((Math.random() * 40 - 10).toFixed(2)),
      orderGrowth: parseFloat((Math.random() * 30 - 5).toFixed(2)),
      rateGrowth: parseFloat((Math.random() * 7 - 2).toFixed(2)),
    };

    return {
      code: 200,
      message: 'success',
      data: mockStats,
    };
  }),

  /**
   * Get visit trends
   */
  getVisits: protectedProcedure
    .input(
      z
        .object({
          days: z.number().min(1).max(90).default(30),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const { days = 30 } = input || {};

      // TODO: Replace with actual database query
      const mockVisits = Array.from({ length: days }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (days - i - 1));
        return {
          date: date.toISOString().split('T')[0],
          visits: Math.floor(Math.random() * 7000) + 1000,
          uniqueVisitors: Math.floor(Math.random() * 4500) + 500,
          pageViews: Math.floor(Math.random() * 17000) + 3000,
        };
      });

      return {
        code: 200,
        message: 'success',
        data: mockVisits,
      };
    }),

  /**
   * Get sales trends
   */
  getSales: protectedProcedure
    .input(
      z
        .object({
          months: z.number().min(1).max(24).default(12),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const { months = 12 } = input || {};

      // TODO: Replace with actual database query
      const monthNames = [
        '1月',
        '2月',
        '3月',
        '4月',
        '5月',
        '6月',
        '7月',
        '8月',
        '9月',
        '10月',
        '11月',
        '12月',
      ];
      const mockSales = Array.from({ length: months }, (_, i) => ({
        month: monthNames[i % 12],
        sales: Math.floor(Math.random() * 150000) + 50000,
        profit: Math.floor(Math.random() * 40000) + 10000,
      }));

      return {
        code: 200,
        message: 'success',
        data: mockSales,
      };
    }),

  /**
   * Get popular products
   */
  getProducts: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).default(10),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const { limit = 10 } = input || {};

      // TODO: Replace with actual database query
      const mockProducts = Array.from({ length: limit }, (_, i) => ({
        id: `product-${i}`,
        name: `Product ${i + 1}`,
        category: `Category ${(i % 5) + 1}`,
        price: parseFloat((Math.random() * 990 + 10).toFixed(2)),
        sales: Math.floor(Math.random() * 4900) + 100,
        stock: Math.floor(Math.random() * 500),
        image: `https://api.dicebear.com/7.x/shapes/svg?seed=${i}`,
      }));

      return {
        code: 200,
        message: 'success',
        data: mockProducts,
      };
    }),

  /**
   * Get recent orders
   */
  getOrders: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).default(10),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const { limit = 10 } = input || {};

      // TODO: Replace with actual database query
      const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const;
      const mockOrders = Array.from({ length: limit }, (_, i) => ({
        id: `order-${i}`,
        orderNo: `ORD${String(Date.now() + i).slice(-10)}`,
        customer: `Customer ${i + 1}`,
        amount: parseFloat((Math.random() * 9900 + 100).toFixed(2)),
        status: statuses[Math.floor(Math.random() * statuses.length)],
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      }));

      return {
        code: 200,
        message: 'success',
        data: mockOrders,
      };
    }),

  /**
   * Get user activities
   */
  getActivities: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(20),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const { limit = 20 } = input || {};

      // TODO: Replace with actual database query
      const actions = ['Login', 'Create Order', 'Update Profile', 'Upload File', 'Comment', 'Share'];
      const mockActivities = Array.from({ length: limit }, (_, i) => ({
        id: `activity-${i}`,
        user: `User ${i + 1}`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`,
        action: actions[Math.floor(Math.random() * actions.length)],
        target: `Target ${i + 1}`,
        time: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
      }));

      return {
        code: 200,
        message: 'success',
        data: mockActivities,
      };
    }),

  /**
   * Get system overview
   */
  getOverview: protectedProcedure.query(async () => {
    // TODO: Replace with actual system metrics
    const mockOverview = {
      cpu: Math.floor(Math.random() * 70) + 20,
      memory: Math.floor(Math.random() * 55) + 30,
      disk: Math.floor(Math.random() * 35) + 40,
      network: Math.floor(Math.random() * 50) + 10,
      uptime: Math.floor(Math.random() * 8553600) + 86400,
      requests: Math.floor(Math.random() * 90000) + 10000,
      errors: Math.floor(Math.random() * 100),
      responseTime: Math.floor(Math.random() * 450) + 50,
    };

    return {
      code: 200,
      message: 'success',
      data: mockOverview,
    };
  }),

  /**
   * Get traffic sources
   */
  getTrafficSources: protectedProcedure.query(async () => {
    // TODO: Replace with actual analytics data
    const mockSources = [
      { name: 'Direct', value: Math.floor(Math.random() * 600) + 200 },
      { name: 'Search Engine', value: Math.floor(Math.random() * 550) + 150 },
      { name: 'Social Media', value: Math.floor(Math.random() * 320) + 80 },
      { name: 'Email Marketing', value: Math.floor(Math.random() * 150) + 50 },
    ];

    return {
      code: 200,
      message: 'success',
      data: mockSources,
    };
  }),

  /**
   * Get pending tasks
   */
  getTasks: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(['pending', 'in_progress', 'done']).optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const { status } = input || {};

      // TODO: Replace with actual database query
      const statuses = ['pending', 'in_progress', 'done'] as const;
      const mockTasks = Array.from({ length: 8 }, (_, i) => ({
        id: `task-${i}`,
        title: `Task ${i + 1}`,
        status: status || statuses[Math.floor(Math.random() * statuses.length)],
      }));

      return {
        code: 200,
        message: 'success',
        data: mockTasks,
      };
    }),
});
