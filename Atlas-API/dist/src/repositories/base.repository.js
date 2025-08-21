"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AbstractBaseRepository = void 0;
class AbstractBaseRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(params) {
        const { skip, take, where, orderBy } = params || {};
        return this.model.findMany({
            skip,
            take,
            where,
            orderBy,
        });
    }
    async findOne(where) {
        return this.model.findFirst({ where });
    }
    async findById(id) {
        return this.model.findUnique({ where: { id } });
    }
    async create(data) {
        return this.model.create({ data });
    }
    async update(id, data) {
        return this.model.update({
            where: { id },
            data,
        });
    }
    async delete(id) {
        return this.model.delete({ where: { id } });
    }
    async count(where) {
        return this.model.count({ where });
    }
}
exports.AbstractBaseRepository = AbstractBaseRepository;
//# sourceMappingURL=base.repository.js.map