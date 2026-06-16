import { z } from 'zod';

export const metricsSchema = z.object({
	totalProducts: z.number(),
	totalWarehouses: z.number(),
	totalInventory: z.number(),
	activeReservations: z.number(),
	cancelledReservations: z.number(),
	reservationsCreatedToday: z.number(),
});

export const lowStockItemSchema = z.object({
	productName: z.string(),
	productSku: z.string(),
	warehouseName: z.string(),
	quantity: z.number(),
	threshold: z.number(),
});

export const recentReservationSchema = z.object({
	id: z.string(),
	productName: z.string(),
	warehouseName: z.string(),
	quantity: z.number(),
	status: z.enum(['Pending', 'Confirmed', 'Cancelled']),
	createdAt: z.date(),
});

export const warehouseMetricSchema = z.object({
	warehouseName: z.string(),
	location: z.string(),
	totalProducts: z.number(),
	totalQuantity: z.number(),
	activeReservations: z.number(),
});

export const dashboardResponseSchema = z.object({
	metrics: metricsSchema,
	lowStockItems: lowStockItemSchema.array(),
	recentReservations: recentReservationSchema.array(),
	warehouseMetrics: warehouseMetricSchema.array(),
});

export type DashboardResponse = z.infer<typeof dashboardResponseSchema>;
