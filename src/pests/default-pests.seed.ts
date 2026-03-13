import { EntityManager } from '@mikro-orm/postgresql';
import { Pest } from './pest.entity';
import { ActionTemplate } from '../action-templates/action-template.entity';

type PestSeedRecord = {
  name: string;
  description: string;
  symptoms: string;
  prevention: string;
  treatment: string;
  recommendedActions: string[];
};

export const DEFAULT_PESTS: readonly PestSeedRecord[] = [
  {
    name: 'Ślimaki',
    description:
      'Ślimaki należą do jednych z najbardziej uciążliwych szkodników w ogrodach warzywnych. Największe szkody powodują ślimaki nagie, które nie posiadają muszli i są bardzo żarłoczne. Żerują głównie nocą lub w wilgotne, pochmurne dni. W ciągu dnia ukrywają się w glebie, pod kamieniami, deskami lub w gęstej roślinności. Żywią się liśćmi, młodymi pędami oraz kiełkami roślin, a szczególnie upodobały sobie sałatę, kapustę, ogórki, truskawki oraz młode rozsady. Ślimaki potrafią w krótkim czasie zniszczyć całe młode nasadzenia, pozostawiając po sobie charakterystyczne nieregularne dziury w liściach oraz ślady śluzu. Ich populacja bardzo szybko rośnie w wilgotnych latach oraz w ogrodach o dużej ilości materii organicznej i miejsc do ukrycia.',
    symptoms:
      'Nieregularne dziury w liściach, zjedzone młode rośliny oraz widoczne ślady śluzu na glebie i liściach.',
    prevention:
      'Usuwanie miejsc, w których ślimaki mogą się ukrywać, regularne odchwaszczanie grządek oraz stosowanie barier mechanicznych takich jak popiół, trociny lub specjalne obrzeża przeciw ślimakom.',
    treatment:
      'Ręczne zbieranie ślimaków, stosowanie pułapek oraz w przypadku silnej inwazji stosowanie preparatów biologicznych.',
    recommendedActions: [
      'Kontrola szkodników',
      'Usunięcie ręczne szkodników',
      'Instalacja pułapek na szkodniki',
      'Monitoring szkodników (pułapki)',
      'Regularny przegląd uprawy',
    ],
  },
  {
    name: 'Pędraki',
    description:
      'Pędraki to larwy chrząszczy takich jak chrabąszcz majowy. Żyją w glebie przez kilka lat i w tym czasie intensywnie żerują na korzeniach roślin. Uszkodzenia powodowane przez pędraki mogą prowadzić do obumierania roślin, szczególnie młodych sadzonek i rozsad. Pędraki są stosunkowo duże, białe i mają charakterystycznie zgięte ciało w kształcie litery C. Najczęściej spotykane są w glebach lekkich i próchnicznych, szczególnie na terenach wcześniej pokrytych trawą lub łąką. Ich obecność jest trudna do wykrycia, dopóki rośliny nie zaczynają nagle więdnąć i zamierać.',
    symptoms:
      'Nagłe więdnięcie roślin mimo odpowiedniego podlewania oraz obecność dużych białych larw w glebie.',
    prevention:
      'Przekopywanie gleby jesienią i wiosną oraz kontrolowanie gleby przed sadzeniem nowych roślin.',
    treatment:
      'Ręczne usuwanie larw podczas prac w ogrodzie oraz stosowanie biologicznych preparatów przeciw larwom w glebie.',
    recommendedActions: [
      'Kontrola szkodników',
      'Usunięcie ręczne szkodników',
      'Spulchnianie gleby',
      'Głębokie spulchnianie (broadfork)',
      'Regularny przegląd uprawy',
    ],
  },
  {
    name: 'Drutowce',
    description:
      'Drutowce to larwy chrząszczy z rodziny sprężykowatych. Mają twarde, wydłużone ciało o żółtawym lub brązowym kolorze i mogą żyć w glebie nawet przez kilka lat. W tym czasie intensywnie żerują na korzeniach roślin oraz podgryzają bulwy i nasiona. Szczególnie często atakują ziemniaki, marchew, buraki oraz inne rośliny korzeniowe. Uszkodzenia powodowane przez drutowce są trudne do zauważenia na wczesnym etapie, ponieważ większość ich aktywności odbywa się pod powierzchnią gleby. Silne porażenie może doprowadzić do obumarcia młodych roślin lub znacznego obniżenia jakości plonów.',
    symptoms:
      'Uszkodzenia korzeni i bulw, więdnięcie roślin oraz obecność wąskich otworów w warzywach korzeniowych.',
    prevention:
      'Regularne przekopywanie gleby, stosowanie płodozmianu oraz unikanie zakładania nowych grządek na terenach wcześniej porośniętych trawą.',
    treatment:
      'Stosowanie pułapek glebowych, głębokie spulchnianie gleby oraz usuwanie larw podczas prac ogrodowych.',
    recommendedActions: [
      'Kontrola szkodników',
      'Instalacja pułapek na szkodniki',
      'Spulchnianie gleby',
      'Głębokie spulchnianie (broadfork)',
      'Regularny przegląd uprawy',
    ],
  },
  {
    name: 'Turkuć podjadek',
    description:
      'Turkuć podjadek to duży owad glebowy, który prowadzi podziemny tryb życia. Jego charakterystyczne przednie odnóża przypominają łopatki i są przystosowane do kopania tuneli w glebie. Turkuć uszkadza korzenie roślin oraz młode siewki, które często zostają całkowicie podcięte. Szkodnik ten jest szczególnie aktywny w wilgotnych glebach bogatych w materię organiczną. Może powodować znaczne straty w uprawach warzyw, zwłaszcza w młodych nasadzeniach.',
    symptoms:
      'Podgryzione korzenie roślin, zapadanie się gleby w miejscach tuneli oraz nagłe zamieranie młodych roślin.',
    prevention:
      'Regularne przekopywanie gleby oraz usuwanie miejsc sprzyjających rozwojowi szkodnika.',
    treatment:
      'Stosowanie pułapek glebowych oraz mechaniczne niszczenie tuneli.',
    recommendedActions: [
      'Kontrola szkodników',
      'Instalacja pułapek na szkodniki',
      'Spulchnianie gleby',
      'Regularny przegląd uprawy',
    ],
  },
  {
    name: 'Nicienie glebowe',
    description:
      'Nicienie glebowe to mikroskopijne organizmy żyjące w glebie, które mogą atakować korzenie roślin. W wyniku ich żerowania powstają deformacje korzeni, guzowatości oraz zahamowanie wzrostu roślin. Nicienie są szczególnie niebezpieczne w intensywnie użytkowanych glebach oraz w uprawach szklarniowych, gdzie mogą szybko się rozmnażać.',
    symptoms:
      'Zdeformowane korzenie, zahamowanie wzrostu roślin oraz słabszy rozwój roślin mimo odpowiedniej pielęgnacji.',
    prevention:
      'Stosowanie płodozmianu oraz uprawy roślin poplonowych ograniczających rozwój nicieni.',
    treatment:
      'Poprawa struktury gleby oraz stosowanie biologicznych metod ograniczania populacji nicieni.',
    recommendedActions: [
      'Kontrola szkodników',
      'Uprawa roślin poplonowych',
      'Solarizacja gleby',
      'Regularny przegląd uprawy',
    ],
  },
  {
    name: 'Gąsienice motyli',
    description:
      'Gąsienice motyli to larwalne stadia wielu gatunków motyli, które mogą powodować poważne uszkodzenia roślin ogrodowych. Żerują na liściach, kwiatach oraz młodych pędach roślin. W zależności od gatunku mogą całkowicie zjadać liście lub wygryzać w nich duże otwory. W przypadku dużej liczebności mogą bardzo szybko doprowadzić do znacznego osłabienia roślin. Najczęściej występują na roślinach kapustnych, pomidorach, sałacie oraz wielu innych warzywach.',
    symptoms:
      'Duże dziury w liściach, obecność gąsienic na roślinach oraz widoczne odchody na liściach.',
    prevention:
      'Regularne kontrolowanie roślin oraz wspieranie naturalnych wrogów gąsienic takich jak ptaki.',
    treatment:
      'Ręczne usuwanie gąsienic oraz stosowanie oprysków biologicznych.',
    recommendedActions: [
      'Kontrola szkodników',
      'Usunięcie ręczne szkodników',
      'Oprysk biologiczny',
      'Regularny przegląd uprawy',
    ],
  },
  {
    name: 'Bielinek kapustnik',
    description:
      'Bielinek kapustnik to motyl, którego larwy stanowią poważny problem w uprawach roślin kapustnych. Dorosłe motyle składają jaja na spodniej stronie liści. Z jaj wylęgają się gąsienice, które intensywnie żerują na liściach kapusty, kalafiora, brokułów oraz innych roślin z tej rodziny. W krótkim czasie mogą doprowadzić do niemal całkowitego zniszczenia liści. Bielinek jest jednym z najczęściej spotykanych szkodników w ogrodach warzywnych.',
    symptoms:
      'Duże uszkodzenia liści kapustnych oraz obecność zielonych gąsienic na roślinach.',
    prevention:
      'Stosowanie osłon z agrowłókniny oraz regularna kontrola liści.',
    treatment:
      'Ręczne usuwanie gąsienic oraz stosowanie oprysków biologicznych.',
    recommendedActions: [
      'Kontrola szkodników',
      'Usunięcie ręczne szkodników',
      'Oprysk biologiczny',
      'Instalacja siatek ochronnych',
      'Regularny przegląd uprawy',
    ],
  },
  {
    name: 'Tantniś krzyżowiaczek',
    description:
      'Tantniś krzyżowiaczek to niewielki motyl, którego larwy są bardzo groźne dla roślin kapustnych. Gąsienice żerują na spodniej stronie liści, wygryzając w nich liczne drobne otwory. Przy silnym porażeniu mogą doprowadzić do całkowitego zniszczenia liści. Szkodnik ten rozmnaża się bardzo szybko, szczególnie w ciepłe lata.',
    symptoms:
      'Drobne liczne dziury w liściach oraz obecność małych zielonych gąsienic.',
    prevention: 'Regularna kontrola roślin oraz stosowanie płodozmianu.',
    treatment: 'Usuwanie gąsienic oraz stosowanie oprysków biologicznych.',
    recommendedActions: [
      'Kontrola szkodników',
      'Usunięcie ręczne szkodników',
      'Oprysk biologiczny',
      'Regularny przegląd uprawy',
    ],
  },
  {
    name: 'Rolnice',
    description:
      'Rolnice to gąsienice motyli nocnych, które żerują głównie w glebie. W nocy wychodzą na powierzchnię i podgryzają młode rośliny u podstawy łodygi. Uszkodzone rośliny przewracają się i zamierają. Rolnice szczególnie często pojawiają się w ogrodach o dużej ilości chwastów oraz na terenach wcześniej pokrytych trawą.',
    symptoms: 'Podgryzione łodygi młodych roślin oraz nagłe zamieranie siewek.',
    prevention: 'Regularne odchwaszczanie grządek oraz przekopywanie gleby.',
    treatment: 'Stosowanie pułapek oraz ręczne usuwanie gąsienic.',
    recommendedActions: [
      'Kontrola szkodników',
      'Instalacja pułapek na szkodniki',
      'Usunięcie ręczne szkodników',
      'Regularny przegląd uprawy',
    ],
  },
  {
    name: 'Sówka warzywna',
    description:
      'Sówka warzywna to motyl nocny, którego gąsienice żerują na wielu gatunkach roślin warzywnych. Mogą uszkadzać liście, pędy oraz owoce roślin. W ciągu dnia ukrywają się w glebie lub pod liśćmi, a żerują głównie nocą. Szkodnik ten może powodować poważne straty w uprawach warzyw takich jak pomidory, sałata czy kapusta.',
    symptoms: 'Uszkodzenia liści oraz obecność dużych gąsienic na roślinach.',
    prevention: 'Regularna kontrola roślin oraz usuwanie chwastów.',
    treatment:
      'Ręczne usuwanie gąsienic oraz stosowanie oprysków biologicznych.',
    recommendedActions: [
      'Kontrola szkodników',
      'Usunięcie ręczne szkodników',
      'Oprysk biologiczny',
      'Regularny przegląd uprawy',
    ],
  },
  {
    name: 'Stonka ziemniaczana',
    description:
      'Stonka ziemniaczana to jeden z najbardziej znanych szkodników upraw warzywnych. Zarówno dorosłe chrząszcze, jak i ich larwy żywią się liśćmi roślin z rodziny psiankowatych, szczególnie ziemniaków, pomidorów oraz bakłażanów. Silne porażenie może prowadzić do całkowitego ogołocenia roślin z liści, co znacznie obniża plon. Stonka rozmnaża się szybko i może wytworzyć kilka pokoleń w ciągu sezonu.',
    symptoms:
      'Zjedzone liście roślin, obecność pomarańczowych larw oraz żółto-czarnych chrząszczy na roślinach.',
    prevention: 'Regularne kontrolowanie roślin oraz stosowanie płodozmianu.',
    treatment:
      'Ręczne zbieranie larw i chrząszczy oraz stosowanie oprysków biologicznych lub chemicznych.',
    recommendedActions: [
      'Kontrola szkodników',
      'Usunięcie ręczne szkodników',
      'Oprysk biologiczny',
      'Oprysk chemiczny',
      'Regularny przegląd uprawy',
    ],
  },
  {
    name: 'Pchełki ziemne',
    description:
      'Pchełki ziemne to niewielkie chrząszcze, które potrafią skakać podobnie jak pchły. Żerują głównie na młodych liściach roślin, wygryzając w nich drobne otwory. Najczęściej atakują rośliny z rodziny kapustowatych, takie jak rzodkiewka, kapusta czy rukola. Szkodniki te szczególnie często pojawiają się w ciepłe i suche dni.',
    symptoms: 'Liczne drobne otwory w liściach młodych roślin.',
    prevention:
      'Utrzymywanie wilgotnej gleby oraz stosowanie osłon z agrowłókniny.',
    treatment: 'Stosowanie oprysków ekologicznych oraz przykrywanie roślin.',
    recommendedActions: [
      'Kontrola szkodników',
      'Instalacja siatek ochronnych',
      'Oprysk ekologiczny',
      'Regularny przegląd uprawy',
    ],
  },
  {
    name: 'Chrząszcze liściożerne',
    description:
      'Chrząszcze liściożerne to grupa owadów, które żerują na liściach roślin, wygryzając w nich duże otwory. W zależności od gatunku mogą powodować różne typy uszkodzeń, od drobnych dziur po całkowite zniszczenie blaszki liściowej. Przy dużej liczebności mogą bardzo szybko doprowadzić do osłabienia roślin oraz spadku plonów.',
    symptoms: 'Duże dziury w liściach oraz obecność chrząszczy na roślinach.',
    prevention:
      'Regularna kontrola roślin oraz wspieranie naturalnych wrogów szkodników.',
    treatment:
      'Ręczne usuwanie chrząszczy oraz stosowanie oprysków biologicznych.',
    recommendedActions: [
      'Kontrola szkodników',
      'Usunięcie ręczne szkodników',
      'Oprysk biologiczny',
      'Regularny przegląd uprawy',
    ],
  },
  {
    name: 'Ćmy warzywne',
    description:
      'Ćmy warzywne to grupa motyli, których larwy mogą powodować znaczne szkody w uprawach warzywnych. Dorosłe motyle składają jaja na roślinach, z których wylęgają się gąsienice żerujące na liściach, pędach lub owocach. Uszkodzenia mogą prowadzić do znacznego osłabienia roślin oraz obniżenia plonów. Ćmy szczególnie często pojawiają się w uprawach szklarniowych oraz na roślinach takich jak pomidory czy papryka.',
    symptoms:
      'Dziury w liściach, uszkodzenia owoców oraz obecność gąsienic na roślinach.',
    prevention:
      'Regularne monitorowanie roślin oraz stosowanie pułapek feromonowych.',
    treatment:
      'Ręczne usuwanie gąsienic oraz stosowanie oprysków biologicznych.',
    recommendedActions: [
      'Kontrola szkodników',
      'Monitoring szkodników (pułapki)',
      'Instalacja pułapek na szkodniki',
      'Oprysk biologiczny',
      'Regularny przegląd uprawy',
    ],
  },
  {
    name: 'Owocówki',
    description:
      'Owocówki to motyle, których larwy żerują wewnątrz owoców oraz warzyw. Larwy wgryzają się w tkanki roślinne i drążą korytarze w owocach, co powoduje ich gnicie oraz utratę wartości użytkowej. Szkodniki te są szczególnie niebezpieczne dla pomidorów, papryki oraz wielu roślin sadowniczych.',
    symptoms:
      'Otwory w owocach, obecność korytarzy w miąższu oraz przedwczesne gnicie owoców.',
    prevention:
      'Regularne kontrolowanie owoców oraz usuwanie uszkodzonych części roślin.',
    treatment: 'Stosowanie pułapek feromonowych oraz oprysków biologicznych.',
    recommendedActions: [
      'Kontrola szkodników',
      'Monitoring szkodników (pułapki)',
      'Instalacja pułapek na szkodniki',
      'Oprysk biologiczny',
      'Regularny przegląd uprawy',
    ],
  },
  {
    name: 'Śmietka kapuściana',
    description:
      'Śmietka kapuściana to niewielka muchówka będąca jednym z najgroźniejszych szkodników roślin z rodziny kapustowatych. Dorosłe owady przypominają małe szare muchy i składają jaja w glebie w pobliżu podstawy roślin. Z jaj wylęgają się larwy, które wgryzają się w korzenie oraz dolną część łodygi. Larwy żywią się tkanką rośliny, co prowadzi do uszkodzenia systemu korzeniowego. W wyniku żerowania rośliny zaczynają więdnąć, przestają rosnąć, a w skrajnych przypadkach całkowicie zamierają. Szkodnik ten szczególnie często atakuje kapustę, kalafior, brokuł, brukselkę oraz rzodkiewkę. Największe szkody powodują pierwsze pokolenia wiosenne, gdy rośliny są jeszcze młode i wrażliwe. W warunkach sprzyjających rozwojowi śmietki może pojawić się kilka pokoleń w ciągu jednego sezonu, co znacznie zwiększa ryzyko poważnych strat w uprawie.',
    symptoms:
      'Więdnięcie młodych roślin mimo odpowiedniego podlewania, zahamowanie wzrostu oraz obecność białych larw w korzeniach i w dolnej części łodygi.',
    prevention:
      'Stosowanie płodozmianu, sadzenie roślin w odpowiednich odstępach, stosowanie osłon z agrowłókniny oraz regularne kontrolowanie podstawy roślin.',
    treatment:
      'Usuwanie silnie porażonych roślin, stosowanie pułapek oraz w razie konieczności oprysków biologicznych.',
    recommendedActions: [
      'Kontrola szkodników',
      'Monitoring szkodników (pułapki)',
      'Instalacja siatek ochronnych',
      'Usunięcie ręczne szkodników',
      'Regularny przegląd uprawy',
    ],
  },
  {
    name: 'Śmietka cebulanka',
    description:
      'Śmietka cebulanka to muchówka będąca poważnym szkodnikiem upraw cebuli, czosnku oraz pora. Dorosłe owady składają jaja w glebie w pobliżu roślin. Z jaj wylęgają się larwy, które wgryzają się w cebule i żerują w ich wnętrzu. Uszkodzone rośliny zaczynają żółknąć, więdnąć i gniją od środka. W przypadku silnego porażenia może dojść do całkowitego zniszczenia plonu. Larwy mogą żerować przez kilka tygodni, powodując stopniowe obumieranie roślin. W sprzyjających warunkach śmietka cebulanka może wytworzyć kilka pokoleń w ciągu sezonu.',
    symptoms:
      'Żółknięcie i więdnięcie liści cebuli, gnicie cebul oraz obecność larw w ich wnętrzu.',
    prevention:
      'Stosowanie płodozmianu, sadzenie cebuli w miejscach przewiewnych oraz stosowanie osłon ochronnych.',
    treatment:
      'Usuwanie porażonych roślin oraz stosowanie pułapek i oprysków biologicznych.',
    recommendedActions: [
      'Kontrola szkodników',
      'Monitoring szkodników (pułapki)',
      'Instalacja siatek ochronnych',
      'Usunięcie ręczne szkodników',
      'Regularny przegląd uprawy',
    ],
  },
  {
    name: 'Śmietka kiełkówka',
    description:
      'Śmietka kiełkówka to muchówka będąca groźnym szkodnikiem wielu roślin warzywnych. Dorosłe muchy składają jaja w glebie w pobliżu nasion lub młodych siewek. Z jaj wylęgają się larwy, które żerują na kiełkujących nasionach oraz młodych roślinach. Larwy wgryzają się w nasiona i siewki, powodując ich zamieranie jeszcze przed pojawieniem się na powierzchni gleby. W wyniku ich żerowania wschody roślin mogą być bardzo nierównomierne lub całkowicie zniszczone. Szkodnik szczególnie często atakuje fasolę, ogórki, groch, kukurydzę oraz inne rośliny wysiewane bezpośrednio do gruntu.',
    symptoms:
      'Brak wschodów roślin lub zamieranie młodych siewek, uszkodzone nasiona oraz obecność białych larw w glebie.',
    prevention:
      'Stosowanie zdrowego materiału siewnego, odpowiednie przygotowanie gleby oraz unikanie wysiewu w zbyt zimnej i wilgotnej glebie.',
    treatment:
      'Usuwanie porażonych siewek oraz stosowanie biologicznych metod ograniczania populacji szkodnika.',
    recommendedActions: [
      'Kontrola szkodników',
      'Regularny przegląd uprawy',
      'Poprawa warunków kiełkowania',
    ],
  },
  {
    name: 'Połyśnica marchwianka',
    description:
      'Połyśnica marchwianka to niewielka muchówka będąca jednym z najgroźniejszych szkodników marchwi oraz innych warzyw korzeniowych. Dorosłe owady składają jaja w glebie w pobliżu roślin. Z jaj wylęgają się larwy, które wgryzają się w korzenie marchwi, tworząc w nich liczne korytarze. Uszkodzone korzenie tracą wartość użytkową, stają się podatne na choroby oraz gniją podczas przechowywania. Połyśnica jest szczególnie aktywna w wilgotnych i zacienionych ogrodach. W sezonie może pojawić się kilka pokoleń tego szkodnika.',
    symptoms:
      'Brązowe korytarze w korzeniach marchwi, zahamowanie wzrostu roślin oraz deformacje korzeni.',
    prevention:
      'Uprawa marchwi w miejscach przewiewnych i słonecznych, stosowanie płodozmianu oraz osłon z agrowłókniny.',
    treatment:
      'Usuwanie porażonych roślin oraz stosowanie pułapek i oprysków biologicznych.',
    recommendedActions: [
      'Kontrola szkodników',
      'Monitoring szkodników (pułapki)',
      'Instalacja siatek ochronnych',
      'Regularny przegląd uprawy',
    ],
  },
  {
    name: 'Mszyca kapuściana',
    description:
      'Mszyca kapuściana to wyspecjalizowany gatunek mszyc atakujący przede wszystkim rośliny z rodziny kapustowatych. Tworzy bardzo liczne kolonie na spodniej stronie liści oraz na młodych pędach roślin. Owady te wysysają soki z roślin, co prowadzi do deformacji liści, zahamowania wzrostu oraz ogólnego osłabienia roślin. W wyniku żerowania liście mogą zwijać się, żółknąć oraz pokrywać się lepką spadzią. Spadź ta sprzyja rozwojowi grzybów sadzakowych, które dodatkowo ograniczają fotosyntezę. Mszyca kapuściana jest szczególnie niebezpieczna dla kapusty, brokułów, kalafiora, jarmużu oraz innych roślin kapustnych.',
    symptoms:
      'Gęste kolonie szarozielonych mszyc na liściach, skręcanie się liści, zahamowanie wzrostu roślin oraz obecność lepkiej spadzi.',
    prevention:
      'Regularna kontrola liści roślin kapustnych, wspieranie naturalnych wrogów mszyc oraz stosowanie płodozmianu.',
    treatment:
      'Ręczne usuwanie kolonii mszyc oraz stosowanie oprysków ekologicznych lub biologicznych.',
    recommendedActions: [
      'Kontrola szkodników',
      'Usunięcie ręczne szkodników',
      'Oprysk ekologiczny',
      'Oprysk biologiczny',
      'Zwalczanie mszyc',
      'Regularny przegląd uprawy',
    ],
  },
  {
    name: 'Mszyca brzoskwiniowa',
    description:
      'Mszyca brzoskwiniowa to jeden z najgroźniejszych gatunków mszyc występujących w ogrodach warzywnych i sadach. Atakuje wiele gatunków roślin, w tym pomidory, paprykę, ziemniaki oraz rośliny ozdobne. Oprócz bezpośredniego wysysania soków roślinnych, mszyca ta jest szczególnie niebezpieczna jako wektor licznych chorób wirusowych roślin. Szkodnik rozmnaża się bardzo szybko i w sprzyjających warunkach może tworzyć bardzo duże kolonie w krótkim czasie.',
    symptoms:
      'Zwijanie się i deformacja liści, zahamowanie wzrostu roślin oraz obecność kolonii mszyc na młodych pędach.',
    prevention:
      'Regularna kontrola młodych pędów roślin oraz wspieranie obecności naturalnych drapieżników takich jak biedronki.',
    treatment:
      'Usuwanie kolonii mszyc oraz stosowanie oprysków biologicznych i ekologicznych.',
    recommendedActions: [
      'Kontrola szkodników',
      'Usunięcie ręczne szkodników',
      'Oprysk ekologiczny',
      'Oprysk biologiczny',
      'Zwalczanie mszyc',
      'Regularny przegląd uprawy',
    ],
  },
  {
    name: 'Mączlik szklarniowy',
    description:
      'Mączlik szklarniowy to bardzo częsty szkodnik upraw prowadzonych w szklarniach oraz tunelach foliowych. Dorosłe owady przypominają drobne białe muszki, które unoszą się nad roślinami po ich poruszeniu. Larwy oraz osobniki dorosłe wysysają soki z liści, powodując ich żółknięcie oraz stopniowe osłabienie roślin. Podobnie jak mszyce wydzielają spadź, która sprzyja rozwojowi grzybów sadzakowych. Mączlik szklarniowy szczególnie często atakuje pomidory, ogórki, paprykę oraz rośliny ozdobne uprawiane pod osłonami.',
    symptoms:
      'Chmura białych owadów unoszących się z liści, żółknięcie liści oraz obecność lepkiej spadzi na ich powierzchni.',
    prevention:
      'Regularna kontrola roślin w szklarni oraz stosowanie tablic lepnych do monitorowania populacji.',
    treatment:
      'Stosowanie tablic lepnych, oprysków biologicznych oraz usuwanie silnie porażonych liści.',
    recommendedActions: [
      'Monitoring szkodników (pułapki)',
      'Montaż pułapek lepnych',
      'Kontrola szkodników',
      'Oprysk biologiczny',
      'Oprysk ekologiczny',
      'Zwalczanie mączlików',
    ],
  },
  {
    name: 'Przędziorek chmielowiec',
    description:
      'Przędziorek chmielowiec to bardzo mały pajęczak będący jednym z najgroźniejszych szkodników w uprawach szklarniowych. Żeruje głównie na spodniej stronie liści, wysysając soki roślinne. W wyniku jego żerowania na liściach pojawiają się drobne jasne plamki, które z czasem prowadzą do żółknięcia i zasychania liści. Charakterystycznym objawem obecności przędziorka jest również delikatna pajęczynka widoczna między liśćmi roślin. Szkodnik szczególnie szybko rozwija się w warunkach wysokiej temperatury i niskiej wilgotności powietrza.',
    symptoms:
      'Drobne jasne plamki na liściach, obecność delikatnej pajęczynki oraz stopniowe zasychanie liści.',
    prevention:
      'Utrzymywanie odpowiedniej wilgotności powietrza w szklarni oraz regularna kontrola spodniej strony liści.',
    treatment:
      'Usuwanie porażonych liści oraz stosowanie oprysków biologicznych.',
    recommendedActions: [
      'Kontrola szkodników',
      'Oprysk biologiczny',
      'Oprysk ekologiczny',
      'Zwalczanie przędziorków',
      'Monitoring szkodników (pułapki)',
    ],
  },
  {
    name: 'Wciornastek zachodni',
    description:
      'Wciornastek zachodni to jeden z najgroźniejszych gatunków wciornastków występujących w uprawach szklarniowych. Owady te żerują na liściach, kwiatach oraz młodych pędach roślin. Uszkadzają tkanki roślin poprzez nakłuwanie komórek i wysysanie ich zawartości. W wyniku żerowania na liściach pojawiają się srebrzyste przebarwienia oraz drobne czarne punkty będące odchodami owadów. Wciornastek zachodni może również przenosić choroby wirusowe roślin.',
    symptoms:
      'Srebrzyste plamy na liściach, deformacje kwiatów oraz obecność drobnych owadów na roślinach.',
    prevention: 'Regularne monitorowanie upraw oraz stosowanie tablic lepnych.',
    treatment:
      'Stosowanie oprysków biologicznych oraz usuwanie silnie porażonych części roślin.',
    recommendedActions: [
      'Kontrola szkodników',
      'Monitoring szkodników (pułapki)',
      'Montaż pułapek lepnych',
      'Oprysk biologiczny',
      'Oprysk ekologiczny',
    ],
  },
  {
    name: 'Miniarka psiankowata',
    description:
      'Miniarka psiankowata to muchówka, której larwy żerują w liściach roślin z rodziny psiankowatych. Larwy drążą charakterystyczne korytarze między warstwami tkanki liścia, co prowadzi do powstawania jasnych, wijących się śladów. Uszkodzenia te ograniczają zdolność roślin do przeprowadzania fotosyntezy oraz osłabiają ich wzrost. Szkodnik szczególnie często atakuje pomidory, paprykę oraz ziemniaki.',
    symptoms:
      'Kręte jasne ślady na liściach będące efektem drążenia korytarzy przez larwy.',
    prevention:
      'Regularne kontrolowanie liści oraz usuwanie porażonych części roślin.',
    treatment:
      'Usuwanie porażonych liści oraz stosowanie oprysków biologicznych.',
    recommendedActions: [
      'Kontrola szkodników',
      'Usuwanie porażonych części',
      'Oprysk biologiczny',
      'Regularny przegląd uprawy',
    ],
  },
  {
    name: 'Skoczki',
    description:
      'Skoczki to niewielkie owady roślinożerne, które potrafią szybko przemieszczać się poprzez skakanie. Żerują na liściach roślin, wysysając z nich soki roślinne. W wyniku ich żerowania na liściach pojawiają się drobne jasne plamki oraz przebarwienia. Skoczki mogą również przenosić choroby wirusowe między roślinami. Najczęściej pojawiają się w ciepłych i suchych warunkach.',
    symptoms:
      'Drobne jasne plamki na liściach, żółknięcie liści oraz obecność małych skaczących owadów na roślinach.',
    prevention:
      'Regularna kontrola roślin oraz utrzymywanie odpowiedniej wilgotności gleby.',
    treatment: 'Stosowanie oprysków ekologicznych oraz biologicznych.',
    recommendedActions: [
      'Kontrola szkodników',
      'Oprysk ekologiczny',
      'Oprysk biologiczny',
      'Regularny przegląd uprawy',
    ],
  },
  {
    name: 'Tarczniki',
    description:
      'Tarczniki to niewielkie owady ssące należące do tej samej grupy co mszyce i wełnowce. Ich ciało jest pokryte twardą, tarczowatą osłoną, która chroni je przed drapieżnikami oraz wieloma środkami ochrony roślin. Tarczniki najczęściej osiedlają się na łodygach oraz spodniej stronie liści roślin, gdzie wysysają soki roślinne. Ich obecność powoduje stopniowe osłabienie rośliny, zahamowanie wzrostu oraz żółknięcie liści. Podobnie jak mszyce wydzielają spadź, która sprzyja rozwojowi grzybów sadzakowych. Tarczniki szczególnie często pojawiają się w uprawach szklarniowych oraz na roślinach doniczkowych, ale mogą również atakować rośliny w ogrodzie.',
    symptoms:
      'Małe, twarde, brązowe lub szare tarczki na łodygach i liściach roślin, lepka spadź na powierzchni liści oraz stopniowe osłabienie rośliny.',
    prevention:
      'Regularne kontrolowanie łodyg i liści roślin oraz utrzymywanie dobrej kondycji roślin poprzez właściwe nawożenie i podlewanie.',
    treatment:
      'Mechaniczne usuwanie owadów z roślin, stosowanie oprysków ekologicznych oraz biologicznych.',
    recommendedActions: [
      'Kontrola szkodników',
      'Usunięcie ręczne szkodników',
      'Oprysk ekologiczny',
      'Oprysk biologiczny',
      'Regularny przegląd uprawy',
    ],
  },
  {
    name: 'Wełnowce',
    description:
      'Wełnowce to niewielkie owady ssące pokryte charakterystycznym białym, watowatym nalotem. Najczęściej pojawiają się na łodygach oraz w kątach liści, gdzie wysysają soki z roślin. Podobnie jak mszyce wydzielają spadź, która sprzyja rozwojowi grzybów sadzakowych. Wełnowce mogą powodować poważne osłabienie roślin oraz zahamowanie ich wzrostu. Szkodniki te szczególnie często występują w uprawach szklarniowych i tunelowych.',
    symptoms:
      'Białe, watowate skupiska na łodygach i liściach roślin, lepka spadź na liściach oraz zahamowanie wzrostu roślin.',
    prevention:
      'Regularna kontrola roślin oraz utrzymywanie odpowiedniej wilgotności powietrza w szklarni.',
    treatment:
      'Usuwanie kolonii ręcznie oraz stosowanie oprysków ekologicznych lub biologicznych.',
    recommendedActions: [
      'Kontrola szkodników',
      'Usunięcie ręczne szkodników',
      'Oprysk ekologiczny',
      'Oprysk biologiczny',
      'Regularny przegląd uprawy',
    ],
  },
  {
    name: 'Nornice',
    description:
      'Nornice to małe gryzonie żyjące w glebie, które mogą powodować poważne szkody w ogrodach. Żerują na korzeniach roślin, bulwach oraz nasionach. Tworzą system tuneli w glebie, który może prowadzić do osiadania grządek oraz uszkodzenia systemu korzeniowego roślin. Szczególnie często pojawiają się w ogrodach położonych w pobliżu łąk i pól.',
    symptoms:
      'Tunele w glebie, uszkodzone korzenie roślin oraz nagłe zamieranie roślin.',
    prevention:
      'Utrzymywanie ogrodu w czystości oraz ograniczanie miejsc, w których gryzonie mogą się ukrywać.',
    treatment: 'Stosowanie pułapek oraz odstraszaczy.',
    recommendedActions: [
      'Kontrola szkodników',
      'Instalacja pułapek na szkodniki',
      'Regularny przegląd uprawy',
    ],
  },
  {
    name: 'Myszy polne',
    description:
      'Myszy polne to niewielkie gryzonie, które mogą powodować szkody w ogrodach warzywnych poprzez podgryzanie korzeni, bulw oraz nasion roślin. Najczęściej pojawiają się jesienią oraz zimą, gdy szukają pożywienia i schronienia. Ich obecność może prowadzić do znacznego zmniejszenia plonów.',
    symptoms: 'Podgryzione korzenie oraz tunele w glebie.',
    prevention:
      'Usuwanie miejsc, w których myszy mogą się ukrywać oraz utrzymywanie porządku w ogrodzie.',
    treatment: 'Stosowanie pułapek oraz odstraszaczy.',
    recommendedActions: [
      'Kontrola szkodników',
      'Instalacja pułapek na szkodniki',
      'Regularny przegląd uprawy',
    ],
  },
  {
    name: 'Krety',
    description:
      'Krety to ssaki owadożerne żyjące w glebie, które choć nie żywią się roślinami, mogą powodować szkody w ogrodzie poprzez kopanie licznych tuneli. System korytarzy prowadzi do przemieszczania się gleby oraz uszkadzania systemów korzeniowych roślin. Kopce kretów mogą również utrudniać pielęgnację grządek.',
    symptoms: 'Kopce ziemi na powierzchni grządek oraz liczne tunele w glebie.',
    prevention: 'Stosowanie barier mechanicznych oraz odstraszaczy.',
    treatment: 'Instalacja pułapek lub odstraszaczy dźwiękowych.',
    recommendedActions: [
      'Kontrola szkodników',
      'Instalacja pułapek na szkodniki',
      'Regularny przegląd uprawy',
    ],
  },
  {
    name: 'Mrówki',
    description:
      'Mrówki same w sobie rzadko powodują bezpośrednie uszkodzenia roślin, jednak w ogrodach warzywnych mogą być problemem ze względu na swoją współpracę z mszycami. Mrówki chronią kolonie mszyc przed drapieżnikami, ponieważ żywią się wydzielaną przez nie spadzią. W rezultacie obecność mrówek często prowadzi do zwiększenia populacji mszyc na roślinach. Mrówki mogą również budować gniazda w glebie, co prowadzi do przesuszania korzeni roślin.',
    symptoms: 'Duża liczba mrówek na roślinach oraz zwiększona obecność mszyc.',
    prevention:
      'Ograniczanie populacji mszyc oraz usuwanie miejsc sprzyjających zakładaniu gniazd przez mrówki.',
    treatment: 'Stosowanie pułapek na mrówki oraz ograniczanie kolonii mszyc.',
    recommendedActions: [
      'Kontrola szkodników',
      'Instalacja pułapek na szkodniki',
      'Regularny przegląd uprawy',
      'Zwalczanie mszyc',
    ],
  },
] as const;

type LoggerLike = {
  warn(message: string): void;
};

export async function upsertDefaultPests(
  em: EntityManager,
  logger?: LoggerLike,
): Promise<void> {
  for (const seed of DEFAULT_PESTS) {
    let pest = await em.findOne(Pest, {
      name: { $ilike: seed.name },
    });

    if (!pest) {
      pest = new Pest();
      pest.name = seed.name;
    }

    pest.description = seed.description;
    pest.symptoms = seed.symptoms;
    pest.prevention = seed.prevention;
    pest.treatment = seed.treatment;

    const actionTemplates: ActionTemplate[] = [];
    for (const actionName of seed.recommendedActions) {
      const actionTemplate = await em.findOne(ActionTemplate, {
        name: { $ilike: actionName },
      });

      if (!actionTemplate) {
        logger?.warn(
          `Action template not found for pest "${seed.name}": "${actionName}"`,
        );
        continue;
      }

      actionTemplates.push(actionTemplate);
    }

    pest.recommendedActions.set(actionTemplates);
    em.persist(pest);
  }

  await em.flush();
}
