import 'dotenv/config';
import { MikroORM, Options } from '@mikro-orm/core';
import mikroOrmOptions from '../common/config/mikro-orm.config';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { Vegetable } from '../vegetables/entities/vegetable.entity';
import { VegetableWindow } from '../vegetables/entities/vegetable-window.entity';
import { VegetableMedia } from '../vegetables/entities/vegetable-media.entity';
import { CompanionRule } from '../companion-rules/entities/companion-rule.entity';
import { RotationFamilyRule } from '../rotation/entities/rotation-family-rule.entity';
import {
  CompanionRelation,
  WindowType,
  MediaType,
  RotationRelation,
} from '../common/enums/vegetable.enums';

async function seed() {
  const orm = await MikroORM.init(mikroOrmOptions as Options<PostgreSqlDriver>);
  const em = orm.em.fork();

  try {
    console.log('Seeding vegetables...');

    const tomato = em.create(Vegetable, {
      slug: 'tomato',
      name: 'Tomato',
      latinName: 'Solanum lycopersicum',
      family: 'Solanaceae',
      plantType: undefined,
      description: 'A common garden tomato.',
      seedDepth: 0.5,
      rowSpacing: 60,
      plantSpacing: 45,
    });

    const tomatoSowing = em.create(VegetableWindow, {
      type: WindowType.SOWING,
      startMonth: 3,
      endMonth: 5,
      vegetable: tomato,
    });
    const tomatoHarvest = em.create(VegetableWindow, {
      type: WindowType.HARVEST,
      startMonth: 7,
      endMonth: 9,
      vegetable: tomato,
    });
    const tomatoMedia = em.create(VegetableMedia, {
      type: MediaType.IMAGE,
      url: 'https://example.com/tomato.jpg',
      title: 'Tomato',
      vegetable: tomato,
    });
    tomato.calendarWindows.add(tomatoSowing, tomatoHarvest);
    tomato.media.add(tomatoMedia);

    const basil = em.create(Vegetable, {
      slug: 'basil',
      name: 'Basil',
      latinName: 'Ocimum basilicum',
      family: 'Lamiaceae',
      description: 'A fragrant herb, great companion for tomatoes.',
      seedDepth: 0.3,
      rowSpacing: 30,
      plantSpacing: 20,
    });

    const basilSowing = em.create(VegetableWindow, {
      type: WindowType.SOWING,
      startMonth: 4,
      endMonth: 6,
      vegetable: basil,
    });
    const basilHarvest = em.create(VegetableWindow, {
      type: WindowType.HARVEST,
      startMonth: 6,
      endMonth: 10,
      vegetable: basil,
    });
    const basilMedia = em.create(VegetableMedia, {
      type: MediaType.IMAGE,
      url: 'https://example.com/basil.jpg',
      title: 'Basil',
      vegetable: basil,
    });
    basil.calendarWindows.add(basilSowing, basilHarvest);
    basil.media.add(basilMedia);

    await em.persistAndFlush([tomato, basil]);

    const companion = em.create(CompanionRule, {
      source: tomato,
      target: basil,
      relation: CompanionRelation.GOOD,
      note: 'Basil improves tomato flavor and repels pests.',
    });

    const rotation = em.create(RotationFamilyRule, {
      fromFamily: 'Solanaceae',
      toFamily: 'Fabaceae',
      relation: RotationRelation.GOOD_AFTER,
    });

    await em.persistAndFlush([companion, rotation]);

    console.log('Seeding finished.');
  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    await orm.close(true);
  }
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
