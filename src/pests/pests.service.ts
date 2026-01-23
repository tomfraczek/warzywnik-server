import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Pest } from './pest.entity';
import {
  CreatePestDto,
  ListPestsQueryDto,
  UpdatePestDto,
} from './dto/pest.schemas';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Injectable()
export class PestsService {
  constructor(private readonly em: EntityManager) {}

  async list(query: ListPestsQueryDto) {
    const { page, limit, q } = query;

    const where: Record<string, unknown> = {};

    if (q) {
      where.$or = [
        { name: { $ilike: `%${q}%` } },
        { slug: { $ilike: `%${q}%` } },
      ];
    }

    const [items, total] = await this.em.findAndCount(Pest, where, {
      limit,
      offset: (page - 1) * limit,
      orderBy: { name: 'asc' },
    });

    return {
      items,
      page,
      limit,
      total,
    };
  }

  async getByIdOrSlug(idOrSlug: string) {
    const isUuid = UUID_REGEX.test(idOrSlug);
    const entity = await this.em.findOne(
      Pest,
      isUuid ? { id: idOrSlug } : { slug: idOrSlug },
    );

    if (!entity) {
      throw new NotFoundException('Pest not found');
    }

    return entity;
  }

  async create(dto: CreatePestDto) {
    const existing = await this.em.findOne(Pest, { slug: dto.slug });
    if (existing) {
      throw new ConflictException('Pest slug already exists');
    }

    const pest = new Pest();
    pest.slug = dto.slug;
    pest.name = dto.name;
    pest.description = dto.description;
    pest.symptoms = dto.symptoms ?? null;
    pest.prevention = dto.prevention ?? null;
    pest.treatment = dto.treatment ?? null;

    await this.em.persistAndFlush(pest);
    return pest;
  }

  async update(id: string, dto: UpdatePestDto) {
    const pest = await this.em.findOne(Pest, { id });
    if (!pest) {
      throw new NotFoundException('Pest not found');
    }

    if (dto.slug && dto.slug !== pest.slug) {
      const existing = await this.em.findOne(Pest, { slug: dto.slug });
      if (existing) {
        throw new ConflictException('Pest slug already exists');
      }
      pest.slug = dto.slug;
    }

    if (dto.name !== undefined) {
      pest.name = dto.name;
    }

    if (dto.description !== undefined) {
      pest.description = dto.description;
    }

    if (dto.symptoms !== undefined) {
      pest.symptoms = dto.symptoms;
    }

    if (dto.prevention !== undefined) {
      pest.prevention = dto.prevention;
    }

    if (dto.treatment !== undefined) {
      pest.treatment = dto.treatment;
    }

    await this.em.flush();
    return pest;
  }

  async remove(id: string) {
    const pest = await this.em.findOne(Pest, { id });
    if (!pest) {
      throw new NotFoundException('Pest not found');
    }

    await this.em.removeAndFlush(pest);
  }
}
