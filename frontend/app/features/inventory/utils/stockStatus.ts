export type StockStatus = 'Normal' | 'Atenção' | 'Crítico';

export function getStockStatus(qty: number): StockStatus {
	if (qty < 10) return 'Crítico';
	if (qty < 50) return 'Atenção';
	return 'Normal';
}
