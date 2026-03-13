import { Migration } from '@mikro-orm/migrations';

export class Migration20260313120000 extends Migration {
  up(): void {
    this.addSql(`
      do $$
      declare
        enum_type text;
        target record;
        code text;
      begin
        for target in
          select * from (values
            ('warning_rules', 'code'),
            ('warning_instances', 'code'),
            ('weather_warning_config', 'code')
          ) as t(table_name, column_name)
        loop
          select format('%I.%I', c.udt_schema, c.udt_name)
            into enum_type
          from information_schema.columns c
          where c.table_schema = 'public'
            and c.table_name = target.table_name
            and c.column_name = target.column_name
            and c.data_type = 'USER-DEFINED'
          limit 1;

          if enum_type is null then
            continue;
          end if;

          foreach code in array array[
            'HEAVY_RAIN',
            'STORM_RISK',
            'HAIL_RISK',
            'STRONG_WIND',
            'FROST_RISK',
            'HARD_FROST_RISK',
            'HEAT_STRESS',
            'SUN_SCORCH_RISK',
            'DROUGHT_RISK',
            'WATERING_NEEDED',
            'OVERWATERING_PREPARE',
            'OVERWATERING_CHECK',
            'SOWING_PAUSE_TOO_COLD',
            'GERMINATION_PROTECT_TOO_COLD',
            'TRANSPLANT_DELAY_TOO_COLD',
            'MULCH_RECOMMENDED_HOT_WEATHER',
            'DISEASE_HUMIDITY_RISK_OUTDOOR',
            'LATE_BLIGHT_WEATHER_RISK',
            'DOWNY_MILDEW_WEATHER_RISK',
            'POWDERY_MILDEW_WEATHER_RISK',
            'SLUG_ACTIVITY_HIGH',
            'APHID_PRESSURE_WEATHER',
            'CATERPILLAR_ACTIVITY_RISK',
            'GREENHOUSE_HEAT_STRESS',
            'GREENHOUSE_VENTILATION_REQUIRED',
            'GREENHOUSE_SHADE_REQUIRED',
            'GREENHOUSE_NIGHT_FROST_PROTECTION',
            'GREENHOUSE_HARD_FROST_PROTECTION',
            'GREENHOUSE_STRONG_WIND_SECURE',
            'GREENHOUSE_HEAVY_RAIN_CHECK_DRAINAGE',
            'GREENHOUSE_HIGH_HUMIDITY_RISK',
            'GREENHOUSE_CONDENSATION_RISK',
            'GREENHOUSE_DISEASE_PRESSURE',
            'GREENHOUSE_WHITEFLY_RISK',
            'GREENHOUSE_SPIDER_MITE_RISK',
            'GREENHOUSE_THRIPS_RISK',
            'GREENHOUSE_WATERING_REDUCE_CLOUDY',
            'SOIL_PH_TOO_LOW',
            'SOIL_PH_SLIGHTLY_TOO_LOW',
            'SOIL_PH_TOO_HIGH',
            'SOIL_PH_SLIGHTLY_TOO_HIGH',
            'BED_TOO_SHALLOW',
            'NUTRIENT_DEFICIT_LOW',
            'NUTRIENT_DEFICIT_MEDIUM',
            'NUTRIENT_DEFICIT_HIGH',
            'SOIL_TOO_WET',
            'SOIL_TOO_DRY',
            'SOIL_COMPACTION_RISK',
            'SOIL_STRUCTURE_WEAK',
            'ROTATION_FAMILY_CONFLICT',
            'ROTATION_TOO_SOON_AFTER_SAME_FAMILY',
            'ROTATION_BLOCKING_REQUIRED',
            'HARVEST_NOT_FINISHED',
            'PLANNED_START_TOO_EARLY',
            'SOWING_WINDOW_NOT_STARTED',
            'SOWING_WINDOW_CLOSING',
            'SOWING_WINDOW_ENDED'
          ]
          loop
            execute format('alter type %s add value if not exists %L', enum_type, code);
          end loop;
        end loop;
      end
      $$;
    `);
  }

  down(): void {
    // no-op for enum value additions
  }
}
