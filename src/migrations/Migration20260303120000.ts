import { Migration } from '@mikro-orm/migrations';

export class Migration20260303120000 extends Migration {
  up(): void {
    this.addSql(`
      do $$
      begin
        if not exists (
          select 1
          from pg_type t
          where t.typname = 'beds_cultivation_environment_enum'
        ) then
          create type "beds_cultivation_environment_enum" as enum (
            'GROUND_OUTDOOR',
            'RAISED_BED_OUTDOOR',
            'POT_OUTDOOR',
            'POT_INDOOR',
            'GREENHOUSE',
            'TUNNEL'
          );
        end if;
      end
      $$;
    `);

    this.addSql(`
      alter table "beds"
      add column if not exists "cultivation_environment" "beds_cultivation_environment_enum" not null default 'GROUND_OUTDOOR';
    `);

    this.addSql(`
      do $$
      begin
        if not exists (select 1 from pg_type where typname = 'warning_rules_category_enum') then
          create type "warning_rules_category_enum" as enum ('WEATHER_OUTDOOR', 'WEATHER_GREENHOUSE', 'SOIL', 'ROTATION');
        end if;

        if not exists (select 1 from pg_type where typname = 'warning_rules_horizon_enum') then
          create type "warning_rules_horizon_enum" as enum ('RADAR', 'OPERATIONAL');
        end if;

        if not exists (select 1 from pg_type where typname = 'warning_rules_day_part_enum') then
          create type "warning_rules_day_part_enum" as enum ('DAY', 'NIGHT', 'ANY');
        end if;
      end
      $$;
    `);

    this.addSql(`
      alter table "warning_rules"
      add column if not exists "category" "warning_rules_category_enum" not null default 'WEATHER_OUTDOOR',
      add column if not exists "horizon" "warning_rules_horizon_enum" not null default 'RADAR',
      add column if not exists "day_part" "warning_rules_day_part_enum" not null default 'ANY',
      add column if not exists "generates_task" boolean not null default false;
    `);

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
            'FROST_RISK_TODAY_NIGHT',
            'FROST_RISK_TOMORROW_NIGHT',
            'HARD_FROST_RISK_TODAY_NIGHT',
            'HARD_FROST_RISK_TOMORROW_NIGHT',
            'HEAVY_RAIN_TODAY_DAY',
            'HEAVY_RAIN_TODAY_NIGHT',
            'HEAVY_RAIN_TOMORROW_DAY',
            'HEAVY_RAIN_TOMORROW_NIGHT',
            'WIND_DAMAGE_TODAY_DAY',
            'WIND_DAMAGE_TODAY_NIGHT',
            'WIND_DAMAGE_TOMORROW_DAY',
            'WIND_DAMAGE_TOMORROW_NIGHT',
            'WATERING_NEEDED_TODAY',
            'WATERING_NEEDED_TOMORROW',
            'SOWING_PAUSE_TOO_COLD_TODAY',
            'SOWING_PAUSE_TOO_COLD_TOMORROW',
            'GERMINATION_PROTECT_TOO_COLD_TODAY_NIGHT',
            'GERMINATION_PROTECT_TOO_COLD_TOMORROW_NIGHT',
            'OVERWATERING_PREPARE_TODAY',
            'OVERWATERING_PREPARE_TOMORROW',
            'OVERWATERING_CHECK_TODAY',
            'OVERWATERING_CHECK_TOMORROW',
            'GREENHOUSE_FROST_RISK_TODAY_NIGHT',
            'GREENHOUSE_FROST_RISK_TOMORROW_NIGHT',
            'GREENHOUSE_HARD_FROST_RISK_TODAY_NIGHT',
            'GREENHOUSE_HARD_FROST_RISK_TOMORROW_NIGHT',
            'GREENHOUSE_HEAT_WAVE_TODAY_DAY',
            'GREENHOUSE_HEAT_WAVE_TOMORROW_DAY',
            'GREENHOUSE_STRONG_WIND_TODAY_DAY',
            'GREENHOUSE_STRONG_WIND_TOMORROW_DAY',
            'GREENHOUSE_STORM_TODAY_DAY',
            'GREENHOUSE_STORM_TOMORROW_DAY',
            'GREENHOUSE_HEAVY_RAIN_TODAY_DAY',
            'GREENHOUSE_HEAVY_RAIN_TOMORROW_DAY',
            'GREENHOUSE_SNOW_LOAD_TODAY',
            'GREENHOUSE_SNOW_LOAD_TOMORROW',
            'GREENHOUSE_WET_SNOW_TODAY',
            'GREENHOUSE_WET_SNOW_TOMORROW',
            'GREENHOUSE_SUDDEN_TEMP_DROP_TODAY',
            'GREENHOUSE_SUDDEN_TEMP_DROP_TOMORROW'
          ]
          loop
            execute format('alter type %s add value if not exists %L', enum_type, code);
          end loop;
        end loop;
      end
      $$;
    `);

    // Warning data seeding moved to legit seed services.
    return;

    this.addSql(`
      update "warning_rules"
      set "enabled" = false,
          "is_active" = false,
          "generates_task" = false,
          "horizon" = 'RADAR'
      where "code" in (
        'FUNGAL_DISEASE_PRESSURE_HIGH',
        'GERMINATION_TOO_COLD',
        'OVERWATERING_RISK',
        'HEAVY_RAIN_RISK_NEXT_48H',
        'WIND_DAMAGE_RISK_NEXT_48H'
      );
    `);

    this.addSql(`
      update "warning_rules"
      set
        "title" = case
          when "code" = 'FROST_RISK_NEXT_7_DAYS' then 'Radar: możliwy przymrozek nocą (7 dni)'
          when "code" = 'HARD_FROST_RISK_NEXT_7_DAYS' then 'Radar: możliwy silny mróz nocą (7 dni)'
          else "title"
        end,
        "message_template" = case
          when "code" = 'FROST_RISK_NEXT_7_DAYS' then 'W najbliższych 7 dniach nocą/przed świtem możliwy spadek temperatury do {minTempC}°C (próg {thresholdC}°C).'
          when "code" = 'HARD_FROST_RISK_NEXT_7_DAYS' then 'W najbliższych 7 dniach nocą/przed świtem możliwy silny mróz do {minTempC}°C (próg {thresholdC}°C).'
          else "message_template"
        end,
        "horizon" = 'RADAR',
        "day_part" = 'NIGHT',
        "generates_task" = false
      where "code" in ('FROST_RISK_NEXT_7_DAYS', 'HARD_FROST_RISK_NEXT_7_DAYS', 'DROUGHT_RISK_NEXT_7_DAYS');
    `);

    this.addSql(`
      insert into "warning_rules" (
        "code", "enabled", "severity", "title", "message_template", "hint_template", "blocking", "cooldown_days", "is_active", "category", "horizon", "day_part", "generates_task"
      ) values
        ('FROST_RISK_TODAY_NIGHT', true, 'CRITICAL', 'Dziś w nocy: ryzyko przymrozku', '{dayLabel} {dayPartLabel} możliwy spadek temperatury do {minTempC}°C (próg {thresholdC}°C).', null, false, 0, true, 'WEATHER_OUTDOOR', 'OPERATIONAL', 'NIGHT', true),
        ('FROST_RISK_TOMORROW_NIGHT', true, 'CRITICAL', 'Jutro w nocy: ryzyko przymrozku', '{dayLabel} {dayPartLabel} możliwy spadek temperatury do {minTempC}°C (próg {thresholdC}°C).', null, false, 0, true, 'WEATHER_OUTDOOR', 'OPERATIONAL', 'NIGHT', true),
        ('HARD_FROST_RISK_TODAY_NIGHT', true, 'CRITICAL', 'Dziś w nocy: ryzyko silnego mrozu', '{dayLabel} {dayPartLabel} możliwy silny mróz do {minTempC}°C (próg {thresholdC}°C).', null, false, 0, true, 'WEATHER_OUTDOOR', 'OPERATIONAL', 'NIGHT', true),
        ('HARD_FROST_RISK_TOMORROW_NIGHT', true, 'CRITICAL', 'Jutro w nocy: ryzyko silnego mrozu', '{dayLabel} {dayPartLabel} możliwy silny mróz do {minTempC}°C (próg {thresholdC}°C).', null, false, 0, true, 'WEATHER_OUTDOOR', 'OPERATIONAL', 'NIGHT', true),
        ('HEAVY_RAIN_TODAY_DAY', true, 'WARNING', 'Dziś w dzień: intensywne opady', '{dayLabel} {dayPartLabel}: suma opadów {precipSumMm} mm (próg {thresholdMm} mm).', null, false, 0, true, 'WEATHER_OUTDOOR', 'OPERATIONAL', 'DAY', true),
        ('HEAVY_RAIN_TODAY_NIGHT', true, 'WARNING', 'Dziś w nocy: intensywne opady', '{dayLabel} {dayPartLabel}: suma opadów {precipSumMm} mm (próg {thresholdMm} mm).', null, false, 0, true, 'WEATHER_OUTDOOR', 'OPERATIONAL', 'NIGHT', true),
        ('HEAVY_RAIN_TOMORROW_DAY', true, 'WARNING', 'Jutro w dzień: intensywne opady', '{dayLabel} {dayPartLabel}: suma opadów {precipSumMm} mm (próg {thresholdMm} mm).', null, false, 0, true, 'WEATHER_OUTDOOR', 'OPERATIONAL', 'DAY', true),
        ('HEAVY_RAIN_TOMORROW_NIGHT', true, 'WARNING', 'Jutro w nocy: intensywne opady', '{dayLabel} {dayPartLabel}: suma opadów {precipSumMm} mm (próg {thresholdMm} mm).', null, false, 0, true, 'WEATHER_OUTDOOR', 'OPERATIONAL', 'NIGHT', true),
        ('WIND_DAMAGE_TODAY_DAY', true, 'WARNING', 'Dziś w dzień: ryzyko szkód od wiatru', '{dayLabel} {dayPartLabel}: wiatr do {windMaxKmh} km/h (próg {thresholdKmh} km/h).', null, false, 0, true, 'WEATHER_OUTDOOR', 'OPERATIONAL', 'DAY', true),
        ('WIND_DAMAGE_TODAY_NIGHT', true, 'WARNING', 'Dziś w nocy: ryzyko szkód od wiatru', '{dayLabel} {dayPartLabel}: wiatr do {windMaxKmh} km/h (próg {thresholdKmh} km/h).', null, false, 0, true, 'WEATHER_OUTDOOR', 'OPERATIONAL', 'NIGHT', true),
        ('WIND_DAMAGE_TOMORROW_DAY', true, 'WARNING', 'Jutro w dzień: ryzyko szkód od wiatru', '{dayLabel} {dayPartLabel}: wiatr do {windMaxKmh} km/h (próg {thresholdKmh} km/h).', null, false, 0, true, 'WEATHER_OUTDOOR', 'OPERATIONAL', 'DAY', true),
        ('WIND_DAMAGE_TOMORROW_NIGHT', true, 'WARNING', 'Jutro w nocy: ryzyko szkód od wiatru', '{dayLabel} {dayPartLabel}: wiatr do {windMaxKmh} km/h (próg {thresholdKmh} km/h).', null, false, 0, true, 'WEATHER_OUTDOOR', 'OPERATIONAL', 'NIGHT', true),
        ('WATERING_NEEDED_TODAY', true, 'WARNING', 'Dziś: podlewanie operacyjne', '{dayLabel}: niskie opady ({precipSumMm} mm) i warunki parowania wskazują na potrzebę podlewania.', null, false, 0, true, 'WEATHER_OUTDOOR', 'OPERATIONAL', 'ANY', true),
        ('WATERING_NEEDED_TOMORROW', true, 'WARNING', 'Jutro: podlewanie operacyjne', '{dayLabel}: niskie opady ({precipSumMm} mm) i warunki parowania wskazują na potrzebę podlewania.', null, false, 0, true, 'WEATHER_OUTDOOR', 'OPERATIONAL', 'ANY', true),
        ('SOWING_PAUSE_TOO_COLD_TODAY', true, 'WARNING', 'Dziś: wstrzymaj siew (za zimno)', '{dayLabel}: dla {vegetableName} na {bedName} jest za zimno na bezpieczny siew.', null, false, 0, true, 'WEATHER_OUTDOOR', 'OPERATIONAL', 'ANY', true),
        ('SOWING_PAUSE_TOO_COLD_TOMORROW', true, 'WARNING', 'Jutro: wstrzymaj siew (za zimno)', '{dayLabel}: dla {vegetableName} na {bedName} jest za zimno na bezpieczny siew.', null, false, 0, true, 'WEATHER_OUTDOOR', 'OPERATIONAL', 'ANY', true),
        ('GERMINATION_PROTECT_TOO_COLD_TODAY_NIGHT', true, 'WARNING', 'Dziś w nocy: osłoń kiełkujące rośliny', '{dayLabel} {dayPartLabel}: {vegetableName} na {bedName} wymaga osłony (min {minTempC}°C).', null, false, 0, true, 'WEATHER_OUTDOOR', 'OPERATIONAL', 'NIGHT', true),
        ('GERMINATION_PROTECT_TOO_COLD_TOMORROW_NIGHT', true, 'WARNING', 'Jutro w nocy: osłoń kiełkujące rośliny', '{dayLabel} {dayPartLabel}: {vegetableName} na {bedName} wymaga osłony (min {minTempC}°C).', null, false, 0, true, 'WEATHER_OUTDOOR', 'OPERATIONAL', 'NIGHT', true),
        ('OVERWATERING_PREPARE_TODAY', true, 'WARNING', 'Dziś: przygotuj drenaż', '{dayLabel}: w {bedName} przygotuj odpływ przed opadami ({precipSumMm} mm).', null, false, 0, true, 'WEATHER_OUTDOOR', 'OPERATIONAL', 'ANY', true),
        ('OVERWATERING_PREPARE_TOMORROW', true, 'WARNING', 'Jutro: przygotuj drenaż', '{dayLabel}: w {bedName} przygotuj odpływ przed opadami ({precipSumMm} mm).', null, false, 0, true, 'WEATHER_OUTDOOR', 'OPERATIONAL', 'ANY', true),
        ('OVERWATERING_CHECK_TODAY', true, 'WARNING', 'Dziś: sprawdź zastoiska wody', '{dayLabel}: po opadach skontroluj {bedName} pod kątem zastoisk i drenażu.', null, false, 0, true, 'WEATHER_OUTDOOR', 'OPERATIONAL', 'ANY', true),
        ('OVERWATERING_CHECK_TOMORROW', true, 'WARNING', 'Jutro: sprawdź zastoiska wody', '{dayLabel}: po opadach skontroluj {bedName} pod kątem zastoisk i drenażu.', null, false, 0, true, 'WEATHER_OUTDOOR', 'OPERATIONAL', 'ANY', true),
        ('GREENHOUSE_FROST_RISK_TODAY_NIGHT', true, 'WARNING', 'Szklarnia/tunel: dziś w nocy ryzyko przymrozku', '{dayLabel} {dayPartLabel}: możliwy mróz do {minTempC}°C.', null, false, 0, true, 'WEATHER_GREENHOUSE', 'OPERATIONAL', 'NIGHT', true),
        ('GREENHOUSE_FROST_RISK_TOMORROW_NIGHT', true, 'WARNING', 'Szklarnia/tunel: jutro w nocy ryzyko przymrozku', '{dayLabel} {dayPartLabel}: możliwy mróz do {minTempC}°C.', null, false, 0, true, 'WEATHER_GREENHOUSE', 'OPERATIONAL', 'NIGHT', true),
        ('GREENHOUSE_HARD_FROST_RISK_TODAY_NIGHT', true, 'WARNING', 'Szklarnia/tunel: dziś w nocy ryzyko silnego mrozu', '{dayLabel} {dayPartLabel}: możliwy silny mróz do {minTempC}°C.', null, false, 0, true, 'WEATHER_GREENHOUSE', 'OPERATIONAL', 'NIGHT', true),
        ('GREENHOUSE_HARD_FROST_RISK_TOMORROW_NIGHT', true, 'WARNING', 'Szklarnia/tunel: jutro w nocy ryzyko silnego mrozu', '{dayLabel} {dayPartLabel}: możliwy silny mróz do {minTempC}°C.', null, false, 0, true, 'WEATHER_GREENHOUSE', 'OPERATIONAL', 'NIGHT', true),
        ('GREENHOUSE_HEAT_WAVE_TODAY_DAY', true, 'WARNING', 'Szklarnia/tunel: dziś w dzień ryzyko przegrzania', '{dayLabel} {dayPartLabel}: temperatura może wzrosnąć do {maxTempC}°C.', null, false, 0, true, 'WEATHER_GREENHOUSE', 'OPERATIONAL', 'DAY', true),
        ('GREENHOUSE_HEAT_WAVE_TOMORROW_DAY', true, 'WARNING', 'Szklarnia/tunel: jutro w dzień ryzyko przegrzania', '{dayLabel} {dayPartLabel}: temperatura może wzrosnąć do {maxTempC}°C.', null, false, 0, true, 'WEATHER_GREENHOUSE', 'OPERATIONAL', 'DAY', true),
        ('GREENHOUSE_STRONG_WIND_TODAY_DAY', true, 'WARNING', 'Szklarnia/tunel: dziś w dzień silny wiatr', '{dayLabel} {dayPartLabel}: wiatr do {windMaxKmh} km/h.', null, false, 0, true, 'WEATHER_GREENHOUSE', 'OPERATIONAL', 'DAY', true),
        ('GREENHOUSE_STRONG_WIND_TOMORROW_DAY', true, 'WARNING', 'Szklarnia/tunel: jutro w dzień silny wiatr', '{dayLabel} {dayPartLabel}: wiatr do {windMaxKmh} km/h.', null, false, 0, true, 'WEATHER_GREENHOUSE', 'OPERATIONAL', 'DAY', true),
        ('GREENHOUSE_STORM_TODAY_DAY', true, 'WARNING', 'Szklarnia/tunel: dziś w dzień ryzyko burzy', '{dayLabel} {dayPartLabel}: ryzyko burzowych porywów i opadów.', null, false, 0, true, 'WEATHER_GREENHOUSE', 'OPERATIONAL', 'DAY', true),
        ('GREENHOUSE_STORM_TOMORROW_DAY', true, 'WARNING', 'Szklarnia/tunel: jutro w dzień ryzyko burzy', '{dayLabel} {dayPartLabel}: ryzyko burzowych porywów i opadów.', null, false, 0, true, 'WEATHER_GREENHOUSE', 'OPERATIONAL', 'DAY', true),
        ('GREENHOUSE_HEAVY_RAIN_TODAY_DAY', true, 'WARNING', 'Szklarnia/tunel: dziś w dzień intensywny deszcz', '{dayLabel} {dayPartLabel}: opad {precipSumMm} mm.', null, false, 0, true, 'WEATHER_GREENHOUSE', 'OPERATIONAL', 'DAY', true),
        ('GREENHOUSE_HEAVY_RAIN_TOMORROW_DAY', true, 'WARNING', 'Szklarnia/tunel: jutro w dzień intensywny deszcz', '{dayLabel} {dayPartLabel}: opad {precipSumMm} mm.', null, false, 0, true, 'WEATHER_GREENHOUSE', 'OPERATIONAL', 'DAY', true),
        ('GREENHOUSE_SNOW_LOAD_TODAY', true, 'WARNING', 'Szklarnia/tunel: dziś ryzyko obciążenia śniegiem', '{dayLabel}: śnieg może obciążyć konstrukcję ({snowSumMm} mm).', null, false, 0, true, 'WEATHER_GREENHOUSE', 'OPERATIONAL', 'ANY', true),
        ('GREENHOUSE_SNOW_LOAD_TOMORROW', true, 'WARNING', 'Szklarnia/tunel: jutro ryzyko obciążenia śniegiem', '{dayLabel}: śnieg może obciążyć konstrukcję ({snowSumMm} mm).', null, false, 0, true, 'WEATHER_GREENHOUSE', 'OPERATIONAL', 'ANY', true),
        ('GREENHOUSE_WET_SNOW_TODAY', true, 'WARNING', 'Szklarnia/tunel: dziś ryzyko mokrego śniegu', '{dayLabel}: mokry śnieg zwiększa ryzyko uszkodzeń ({wetSnowMm} mm).', null, false, 0, true, 'WEATHER_GREENHOUSE', 'OPERATIONAL', 'ANY', true),
        ('GREENHOUSE_WET_SNOW_TOMORROW', true, 'WARNING', 'Szklarnia/tunel: jutro ryzyko mokrego śniegu', '{dayLabel}: mokry śnieg zwiększa ryzyko uszkodzeń ({wetSnowMm} mm).', null, false, 0, true, 'WEATHER_GREENHOUSE', 'OPERATIONAL', 'ANY', true),
        ('GREENHOUSE_SUDDEN_TEMP_DROP_TODAY', true, 'WARNING', 'Szklarnia/tunel: dziś nagły spadek temperatury', '{dayLabel}: możliwy nagły spadek temperatury ({tempDropC}°C).', null, false, 0, true, 'WEATHER_GREENHOUSE', 'OPERATIONAL', 'ANY', true),
        ('GREENHOUSE_SUDDEN_TEMP_DROP_TOMORROW', true, 'WARNING', 'Szklarnia/tunel: jutro nagły spadek temperatury', '{dayLabel}: możliwy nagły spadek temperatury ({tempDropC}°C).', null, false, 0, true, 'WEATHER_GREENHOUSE', 'OPERATIONAL', 'ANY', true)
      on conflict ("code") do update set
        "title" = excluded."title",
        "message_template" = excluded."message_template",
        "enabled" = excluded."enabled",
        "is_active" = excluded."is_active",
        "severity" = excluded."severity",
        "category" = excluded."category",
        "horizon" = excluded."horizon",
        "day_part" = excluded."day_part",
        "generates_task" = excluded."generates_task";
    `);
  }

  down(): void {
    this.addSql(
      `alter table "beds" drop column if exists "cultivation_environment";`,
    );
    this.addSql(
      `alter table "warning_rules" drop column if exists "category";`,
    );
    this.addSql(`alter table "warning_rules" drop column if exists "horizon";`);
    this.addSql(
      `alter table "warning_rules" drop column if exists "day_part";`,
    );
    this.addSql(
      `alter table "warning_rules" drop column if exists "generates_task";`,
    );
  }
}
