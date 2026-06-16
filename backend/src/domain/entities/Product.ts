export type Product = {
	id: string;
	sku: string;
	name: string;
	description: string | null;
	isActive: boolean;
	createdAt: Date;
	updatedAt: Date;
};
