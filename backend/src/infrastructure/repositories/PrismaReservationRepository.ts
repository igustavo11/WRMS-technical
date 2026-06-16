import type {
	Reservation,
	ReservationStatus,
} from '../../domain/entities/Reservation';
import type {
	CreateReservationInput,
	IReservationRepository,
} from '../../domain/repositories/IReservationRepository';
import { prisma } from '../database/prisma';

export class PrismaReservationRepository implements IReservationRepository {
	async findById(id: string): Promise<Reservation | null> {
		const reservation = await prisma.reservation.findUnique({ where: { id } });
		return reservation as Reservation | null;
	}

	async findAll(): Promise<Reservation[]> {
		const reservations = await prisma.reservation.findMany();
		return reservations as Reservation[];
	}

	async create(data: CreateReservationInput): Promise<Reservation> {
		const reservation = await prisma.reservation.create({
			data: { ...data, status: 'Pending' },
		});
		return reservation as Reservation;
	}

	async updateStatus(
		id: string,
		status: ReservationStatus,
	): Promise<Reservation> {
		const reservation = await prisma.reservation.update({
			where: { id },
			data: { status },
		});
		return reservation as Reservation;
	}

	async countActive(): Promise<number> {
		return prisma.reservation.count({
			where: { status: { in: ['Pending', 'Confirmed'] } },
		});
	}
}
