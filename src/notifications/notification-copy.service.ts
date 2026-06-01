import { Injectable } from '@nestjs/common';

type NotificationCopy = {
  title: string;
  body: string;
};

@Injectable()
export class NotificationCopyService {
  buildTasksGeneratedCopy(taskCount: number): NotificationCopy {
    return {
      title: 'Nowe zadania w ogrodzie',
      body: `Dodano ${taskCount} nowych zadań.`,
    };
  }

  buildDailySummaryCopy(taskCount: number): NotificationCopy {
    const n = taskCount;
    const zadania = n === 1 ? 'zadanie' : n > 1 && n < 5 ? 'zadania' : 'zadań';
    return {
      title: 'Plan na dziś',
      body: `Masz ${n} ${zadania} do wykonania w ogrodzie.`,
    };
  }

  buildWeatherStatusChangedCopy(
    weatherStatusCode?: string | null,
  ): NotificationCopy {
    const code = (weatherStatusCode ?? '').toUpperCase();

    if (code.includes('THUNDER') || code.includes('STORM')) {
      return {
        title: 'Uwaga na burze',
        body: 'W najbliższym czasie pogoda może być gwałtowna. Zaplanuj prace ostrożnie.',
      };
    }

    if (code.includes('HEAVY_RAIN') || code.includes('RAIN')) {
      return {
        title: 'Zmiana warunków pogodowych',
        body: 'Prognoza wskazuje na opady. Sprawdź, czy grządki mają odpowiedni odpływ wody.',
      };
    }

    if (code.includes('WIND')) {
      return {
        title: 'Silniejszy wiatr w prognozie',
        body: 'Wiatr może utrudnić prace w ogrodzie. Warto sprawdzić osłony i podpory.',
      };
    }

    return {
      title: 'Zmiana pogody',
      body: 'Warunki pogodowe się zmieniły. Sprawdź aktualną prognozę dla swojego ogrodu.',
    };
  }

  buildGardenRiskChangedCopy(riskReason?: string | null): NotificationCopy {
    const reason = (riskReason ?? '').toUpperCase();

    if (reason === 'SOWING_PAUSE') {
      return {
        title: 'Wstrzymaj siew',
        body: 'Dzisiejsze warunki nie są dobre do wysiewu. Sprawdź zalecenia przed rozpoczęciem prac w ogrodzie.',
      };
    }

    if (reason.includes('HARD_FROST')) {
      return {
        title: 'Silny przymrozek',
        body: 'Prognozowany jest mocny spadek temperatury. Warto zabezpieczyć rośliny szczególnie wrażliwe na chłód.',
      };
    }

    if (reason.includes('FROST')) {
      return {
        title: 'Ryzyko przymrozku',
        body: 'W najbliższym czasie temperatura może spaść niebezpiecznie nisko. Zabezpiecz wrażliwe uprawy.',
      };
    }

    if (reason === 'HEAVY_RAIN') {
      return {
        title: 'Intensywny deszcz',
        body: 'Możliwe są silne opady. Sprawdź, czy grządki mają dobry odpływ wody.',
      };
    }

    if (reason === 'WIND_DAMAGE') {
      return {
        title: 'Silny wiatr',
        body: 'Wiatr może uszkodzić podpory i delikatne rośliny. Sprawdź zabezpieczenia w ogrodzie.',
      };
    }

    if (reason === 'WATERING_NEEDED' || reason === 'DROUGHT') {
      return {
        title: 'Rośliny mogą potrzebować podlewania',
        body: 'Warunki wskazują, że część upraw może wymagać podlewania.',
      };
    }

    return {
      title: 'Zmiana ryzyka w ogrodzie',
      body: 'Wykryliśmy zmianę ryzyka dla Twoich upraw. Sprawdź aktualne zalecenia.',
    };
  }

  buildWeatherAlertsSummaryCopy(
    warningCount: number,
    primaryReason?: string | null,
  ): NotificationCopy {
    const reason = (primaryReason ?? '').toUpperCase();

    if (reason.includes('HARD_FROST')) {
      return {
        title: 'Silny przymrozek',
        body: 'Wykryliśmy istotne alerty pogodowe o wysokim ryzyku dla upraw. Sprawdź szczegóły i zabezpiecz rośliny.',
      };
    }

    if (reason.includes('FROST')) {
      return {
        title: 'Ryzyko przymrozku',
        body: 'Wykryliśmy alerty pogodowe związane z niską temperaturą. Warto zabezpieczyć wrażliwe uprawy.',
      };
    }

    if (reason === 'HEAVY_RAIN') {
      return {
        title: 'Intensywny deszcz',
        body: 'Wykryliśmy istotne alerty opadowe. Sprawdź, czy grządki mają drożny odpływ wody.',
      };
    }

    if (reason === 'WIND_DAMAGE') {
      return {
        title: 'Silny wiatr',
        body: 'Wykryliśmy istotne alerty wiatrowe. Zadbaj o stabilność podpór i osłon.',
      };
    }

    if (reason === 'DROUGHT' || reason === 'WATERING_NEEDED') {
      return {
        title: 'Ryzyko przesuszenia',
        body: 'Wykryliśmy alerty pogodowe wskazujące na niedobór wilgoci. Sprawdź potrzeby podlewania upraw.',
      };
    }

    return {
      title: 'Alerty pogodowe',
      body: `Wykryto ${warningCount} istotnych alertów pogodowych.`,
    };
  }

  buildArticleRecommendedCopy(
    articleCount: number,
    articleTitle?: string | null,
  ): NotificationCopy {
    if (articleCount === 1 && articleTitle) {
      return {
        title: 'Nowy artykuł w bibliotece',
        body: `Opublikowaliśmy nowy artykuł: „${articleTitle}”. Zapraszamy do lektury.`,
      };
    }
    return {
      title: 'Nowy artykuł w bibliotece',
      body:
        articleCount === 1
          ? 'Opublikowaliśmy nowy artykuł dla Twoich upraw. Zapraszamy do lektury.'
          : `Opublikowaliśmy ${articleCount} nowe artykuły dla Twoich upraw. Zapraszamy do lektury.`,
    };
  }

  buildLifecycleSuggestionCopy(
    suggestedAction?: string | null,
  ): NotificationCopy {
    const action = (suggestedAction ?? '').toLowerCase();

    if (action.includes('harvest') || action.includes('zbiór')) {
      return {
        title: 'Możesz rozpocząć zbiory',
        body: 'Wygląda na to, że ta uprawa wchodzi w dobry moment na zbiór.',
      };
    }

    if (action.includes('water') || action.includes('podlej')) {
      return {
        title: 'Czas na podlewanie',
        body: 'Warunki wskazują, że ta uprawa może potrzebować wody.',
      };
    }

    return {
      title: 'Sugestia dla Twojej uprawy',
      body: 'Wykryliśmy nową sugestię działań dla jednej z Twoich upraw.',
    };
  }

  buildWeeklyDigestCopy(): NotificationCopy {
    return {
      title: 'Tygodniowe podsumowanie ogrodu',
      body: 'Sprawdź podsumowanie z ostatnich 7 dni.',
    };
  }

  normalizeWarningReason(code?: string | null): string | null {
    if (!code) {
      return null;
    }

    const upperCode = code.toUpperCase();

    if (upperCode.includes('HARD_FROST')) return 'HARD_FROST';
    if (upperCode.includes('FROST')) return 'FROST';
    if (upperCode.includes('SOWING_PAUSE')) return 'SOWING_PAUSE';
    if (upperCode.includes('HEAVY_RAIN')) return 'HEAVY_RAIN';
    if (upperCode.includes('WIND_DAMAGE') || upperCode.includes('STRONG_WIND'))
      return 'WIND_DAMAGE';
    if (upperCode.includes('DROUGHT')) return 'DROUGHT';
    if (upperCode.includes('WATERING_NEEDED')) return 'WATERING_NEEDED';
    if (upperCode.includes('OVERWATERING')) return 'OVERWATERING';
    if (upperCode.includes('GERMINATION_PROTECT')) return 'GERMINATION_PROTECT';

    return upperCode;
  }

  normalizeWeatherStatusReason(code?: string | null): string | null {
    if (!code) {
      return null;
    }

    const upperCode = code.toUpperCase();

    if (upperCode.includes('THUNDER') || upperCode.includes('STORM')) {
      return 'STORM';
    }

    if (upperCode.includes('HARD_FROST')) {
      return 'HARD_FROST';
    }

    if (upperCode.includes('FROST')) {
      return 'FROST';
    }

    if (upperCode.includes('HEAVY_RAIN') || upperCode.includes('RAIN')) {
      return 'HEAVY_RAIN';
    }

    if (upperCode.includes('WIND')) {
      return 'WIND_DAMAGE';
    }

    if (
      upperCode.includes('DROUGHT') ||
      upperCode.includes('DRY') ||
      upperCode.includes('WATERING')
    ) {
      return 'DROUGHT';
    }

    return this.normalizeWarningReason(upperCode) ?? upperCode;
  }

  mapPriorityToRiskLevel(
    priority: string,
  ): 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (priority === 'CRITICAL') return 'CRITICAL';
    if (priority === 'HIGH') return 'HIGH';
    if (priority === 'NORMAL') return 'MEDIUM';
    if (priority === 'LOW') return 'LOW';
    return 'NONE';
  }

  // ─── Intent-specific plural copy builders ──────────────────────────────────

  /**
   * "Podlewanie roślin — 3 grządki wymagają uwagi"
   */
  buildWateringTasksCopy(bedCount: number): NotificationCopy {
    const n = bedCount || 1;
    const suffix =
      n === 1
        ? 'grządka wymaga uwagi'
        : n < 5
          ? 'grządki wymagają uwagi'
          : 'grządek wymaga uwagi';
    return {
      title: 'Podlewanie roślin',
      body: `${n} ${suffix}`,
    };
  }

  /**
   * "Zbiory — 4 uprawy gotowe do zbioru"
   */
  buildHarvestReadyCopy(plantingCount: number): NotificationCopy {
    const n = plantingCount || 1;
    const suffix =
      n === 1
        ? 'uprawa jest gotowa do zbioru'
        : n < 5
          ? 'uprawy są gotowe do zbioru'
          : 'upraw jest gotowych do zbioru';
    return {
      title: 'Zbiory',
      body: `${n} ${suffix}`,
    };
  }

  /**
   * "Ochrona przed przymrozkami — zabezpiecz N upraw"
   */
  buildFrostProtectionCopy(taskCount: number): NotificationCopy {
    const n = taskCount || 1;
    const suffix = n === 1 ? 'uprawę' : n < 5 ? 'uprawy' : 'upraw';
    return {
      title: 'Ochrona przed przymrozkami',
      body: `Zabezpiecz ${n} ${suffix} przed chłodem`,
    };
  }

  /**
   * "Ochrona przed wiatrem — zabezpiecz N upraw"
   */
  buildWindProtectionCopy(taskCount: number): NotificationCopy {
    const n = taskCount || 1;
    const suffix = n === 1 ? 'uprawę' : n < 5 ? 'uprawy' : 'upraw';
    return {
      title: 'Silny wiatr',
      body: `Zabezpiecz ${n} ${suffix} przed wiatrem`,
    };
  }

  /**
   * Plural lifecycle copy: "5 upraw gotowych do zbioru" / "3 uprawy gotowe do przesadzenia"
   */
  buildLifecyclePluralCopy(
    count: number,
    suggestedAction: string,
  ): NotificationCopy {
    const actionLower = suggestedAction.toLowerCase();
    if (actionLower.includes('zbior') || actionLower.includes('harvest')) {
      return {
        title: 'Czas na zbiory 🌿',
        body: `${count} upraw ${count < 5 ? 'jest gotowych' : 'jest gotowych'} do zbioru`,
      };
    }
    if (
      actionLower.includes('transplant') ||
      actionLower.includes('przesadz') ||
      actionLower.includes('rozsada')
    ) {
      return {
        title: 'Rozsada do przesadzenia 🌱',
        body: `${count} rozsad czeka na przesadzenie do grządki`,
      };
    }
    return {
      title: 'Aktualizacja upraw',
      body: `${count} upraw wymaga Twojej uwagi`,
    };
  }
}
