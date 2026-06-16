export class DomainError extends Error {
	readonly code: string;
	readonly statusCode: number;

	constructor(message: string, code: string, statusCode: number) {
		super(message);
		this.name = new.target.name;
		this.code = code;
		this.statusCode = statusCode;
	}
}
