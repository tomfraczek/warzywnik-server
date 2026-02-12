import { BadRequestException, Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { SearchQueryDto } from './dto/search.schemas';

const SEARCH_TYPES = [
  'vegetables',
  'articles',
  'fertilizers',
  'diseases',
  'pests',
  'soils',
] as const;

type SearchType = (typeof SEARCH_TYPES)[number];

type SearchItem = {
  id: string;
  title: string;
  subtitle?: string;
};

export type SearchResponse = {
  query: string;
  limit: number;
  types: SearchType[];
  counts: Record<SearchType, number>;
  items: Record<SearchType, SearchItem[]>;
};

type SearchConfig = {
  table: string;
  field: string;
  subtitleField?: string;
};

const SEARCH_CONFIG: Record<SearchType, SearchConfig> = {
  vegetables: { table: 'vegetables', field: 'name' },
  articles: { table: 'articles', field: 'title', subtitleField: 'excerpt' },
  fertilizers: { table: 'fertilizer_types', field: 'name' },
  diseases: { table: 'diseases', field: 'name' },
  pests: { table: 'pests', field: 'name' },
  soils: { table: 'soils', field: 'name' },
};

@Injectable()
export class SearchService {
  constructor(private readonly em: EntityManager) {}

  async search(dto: SearchQueryDto): Promise<SearchResponse> {
    const query = dto.q.trim();
    const types = this.parseTypes(dto.types);
    const limit = dto.limit;

    const results = await Promise.all(
      types.map((type) => this.searchType(type, query, limit)),
    );

    const counts = {} as Record<SearchType, number>;
    const items = {} as Record<SearchType, SearchItem[]>;

    for (const result of results) {
      counts[result.type] = result.count;
      items[result.type] = result.items;
    }

    return {
      query,
      limit,
      types,
      counts,
      items,
    };
  }

  private parseTypes(typesParam?: string): SearchType[] {
    if (!typesParam) {
      return [...SEARCH_TYPES];
    }

    const raw = typesParam
      .split(',')
      .map((type) => type.trim())
      .filter(Boolean);

    if (!raw.length) {
      throw new BadRequestException('types must contain at least one value');
    }

    const invalid = raw.filter(
      (type) => !SEARCH_TYPES.includes(type as SearchType),
    );

    if (invalid.length) {
      throw new BadRequestException(`Invalid types: ${invalid.join(', ')}`);
    }

    const unique: SearchType[] = [];
    for (const type of raw as SearchType[]) {
      if (!unique.includes(type)) {
        unique.push(type);
      }
    }

    return unique;
  }

  private async searchType(
    type: SearchType,
    query: string,
    limit: number,
  ): Promise<{ type: SearchType; count: number; items: SearchItem[] }> {
    const config = SEARCH_CONFIG[type];
    const contains = `%${query}%`;
    const exact = query;
    const prefix = `${query}%`;
    const subtitleSelect = config.subtitleField
      ? `, ${config.subtitleField} as subtitle`
      : '';
    const countQuery = `select count(*)::int as count from ${config.table} where ${config.field} ilike ?`;
    const itemsQuery = `select id, ${config.field} as title${subtitleSelect}
from ${config.table}
where ${config.field} ilike ?
order by case
  when ${config.field} ilike ? then 0
  when ${config.field} ilike ? then 1
  else 2
end,
${config.field} asc
limit ?`;

    const [countRows, itemRows] = await Promise.all([
      this.em.getConnection().execute(countQuery, [contains]),
      this.em
        .getConnection()
        .execute(itemsQuery, [contains, exact, prefix, limit]),
    ]);

    const count = Number(countRows?.[0]?.count ?? 0);
    const items = (
      itemRows as { id: string; title: string; subtitle?: string }[]
    ).map((row) => {
      if (row.subtitle != null && row.subtitle !== '') {
        return { id: row.id, title: row.title, subtitle: row.subtitle };
      }
      return { id: row.id, title: row.title };
    });

    return { type, count, items };
  }
}
