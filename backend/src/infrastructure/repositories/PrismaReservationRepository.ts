import type {
	Reservation,
	ReservationStatus,
} from '../../domain/entities/Reservation';
import type {
	CreateReservationInput,
	IReservationRepository,
} from '../../domain/repositories/IReservationRepository';
import { type PrismaClientOrTransaction, prisma } from '../database/prisma';

export class PrismaReservationRepository implements IReservationRepository {
	constructor(private readonly client: PrismaClientOrTransaction = prisma) {}

	async findById(id: string): Promise<Reservation | null> {
		const reservation = await this.client.reservation.findUnique({
			where: { id },
		});
		return reservation as Reservation | null;
	}

	async findAll(): Promise<Reservation[]> {
		const reservations = await this.client.reservation.findMany();
		return reservations as Reservation[];
	}

	async create(data: CreateReservationInput): Promise<Reservation> {
		const reservation = await this.client.reservation.create({
			data: { ...data, status: 'Pending' },
		});
		return reservation as Reservation;
	}

	async updateStatus(
		id: string,
		status: ReservationStatus,
	): Promise<Reservation> {
		const reservation = await this.client.reservation.update({
			where: { id },
			data: { status },
		});
		return reservation as Reservation;
	}

	async countActive(): Promise<number> {
		return this.client.reservation.count({
			where: { status: { in: ['Pending', 'Confirmed'] } },
		});
	}
}
