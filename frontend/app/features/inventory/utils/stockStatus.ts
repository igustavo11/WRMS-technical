export type StockStatus = 'Normal' | 'Warning' | 'Critical';

export function getStockStatus(qty: number): StockStatus {
	if (qty < 10) return 'Critical';
	if (qty < 50) return 'Warning';
	return 'Normal';
}
