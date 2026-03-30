import { useTranslations } from "next-intl";
import React, { useEffect, useState } from "react";

const SocialLogins = ({ formik, prev }) => {
  const t = useTranslations("onboardingSport");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  useEffect(() => {
    if (isModalOpen) {
      const prevOverflow = document.body.style.overflow;
      const prevTouchAction = document.body.style.touchAction;
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none"; // improves iOS scroll lock
      return () => {
        document.body.style.overflow = prevOverflow;
        document.body.style.touchAction = prevTouchAction;
      };
    }
  }, [isModalOpen]);

  return (
    <div className="lg:mt-8 mt-6 formInputs">
      <div className="text-center mb-6 lg:mb-8">
        <h2 className="text-[24px] lg:text-[32px]">{t("step4.heading")}</h2>
        <p className="text-base leading-[150%] tracking-[0%]">
          {t("step4.para")}
        </p>
      </div>
      {/* Existing input fields remain unchanged */}
      <div>
        <label className="block mb-2 mt-6">{t("step4.label1")}</label>
        <input
          name="socialLogins.instagram"
          value={formik.values?.socialLogins?.instagram}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          type="text"
          className="w-full border p-2 rounded"
          placeholder={t("step4.userName")}
        />
      </div>
      {formik.touched.socialLogins?.instagram &&
        formik.errors.socialLogins?.instagram && (
          <p className="text-red-500 text-sm mt-2">
            {formik.errors.socialLogins?.instagram}
          </p>
        )}
      <div>
        <label className="block mb-2 mt-6">{t("step4.label2")}</label>
        <input
          name="socialLogins.facebook"
          value={formik.values?.socialLogins?.facebook}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          type="text"
          className="w-full border p-2 rounded"
          placeholder={t("step4.userName")}
        />
      </div>
      {formik.touched.socialLogins?.facebook &&
        formik.errors.socialLogins?.facebook && (
          <p className="text-red-500 text-sm mt-2">
            {formik.errors.socialLogins?.facebook}
          </p>
        )}
      <div>
        <label className="block mb-2 mt-6">Linkedin</label>
        <input
          name="socialLogins.linkedin"
          value={formik.values?.socialLogins?.linkedin}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          type="text"
          className="w-full border p-2 rounded"
          placeholder={t("step4.userName")}
        />
      </div>
      {formik.touched.socialLogins?.linkedin &&
        formik.errors.socialLogins?.linkedin && (
          <p className="text-red-500 text-sm mt-2">
            {formik.errors.socialLogins?.linkedin}
          </p>
        )}
      <div>
        <label className="block mb-2 mt-6"> {t("step4.label3")}</label>
        <input
          name="socialLogins.tikTok"
          value={formik.values?.socialLogins?.tikTok}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          type="text"
          className="w-full border p-2 rounded"
          placeholder={t("step4.userName")}
        />
      </div>
      {formik.touched.socialLogins?.tikTok &&
        formik.errors.socialLogins?.tikTok && (
          <p className="text-red-500 text-sm mt-2">
            {formik.errors.socialLogins?.tikTok}
          </p>
        )}
      <div>
        <label className="block mb-2 mt-6">{t("step4.label4")}</label>
        <input
          name="socialLogins.youTube"
          value={formik.values?.socialLogins?.youTube}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          className="w-full border p-2 rounded"
          placeholder={t("step4.url")}
          type="text"
        />
      </div>
      {formik.touched.socialLogins?.youTube &&
        formik.errors.socialLogins?.youTube && (
          <p className="text-red-500 text-sm mt-2">
            {formik.errors.socialLogins?.youTube}
          </p>
        )}
      <div>
        <label className="block mb-2 mt-6">{t("step4.label5")}</label>
        <input
          name="socialLogins.x"
          value={formik.values?.socialLogins?.x}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          className="w-full border p-2 rounded"
          placeholder={t("step4.userName")}
          type="text"
        />
      </div>
      {formik.touched.socialLogins?.x && formik.errors.socialLogins?.x && (
        <p className="text-red-500 text-sm mt-2">
          {formik.errors.socialLogins?.x}
        </p>
      )}
      <div>
        <label className="block mb-2 mt-6">{t("step4.label6")}</label>
        <input
          name="socialLogins.website"
          value={formik.values?.socialLogins?.website}
          onChange={formik.handleChange}
          onBlur={formik.handleBlur}
          className="w-full border p-2 rounded"
          placeholder={t("step4.url")}
          type="text"
        />
      </div>
      {formik.touched.socialLogins?.website &&
        formik.errors.socialLogins?.website && (
          <p className="text-red-500 text-sm mt-2">
            {formik.errors.socialLogins?.website}
          </p>
        )}
      {/* Terms and Conditions */}
      <div className="mt-6 p-4 rounded bg-gray-50">
        <div className="flex gap-2 items-start">
          <label className="checkbox-wrapper flex items-center">
            <input
              type="checkbox"
              id="termsAccepted"
              name="termsAccepted"
              checked={formik.values.termsAccepted || false}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
            <span className="custom-checkbox"></span>
          </label>
          <span>
            {t("step4.terms")}
            <button
              type="button"
              onClick={openModal}
              className="text-blue-500 underline"
            >
              {t("step4.sports")}
            </button>
            {t("step4.profile")} *
          </span>
        </div>
        {formik.touched.termsAccepted && formik.errors.termsAccepted && (
          <div className="text-red-500 text-sm mt-1">
            {formik.errors.termsAccepted}
          </div>
        )}
      </div>
      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-3xl w-full">
            <h3 className="text-xl font-bold mb-4">Ambassador-ehdot</h3>
            <div className="max-h-[60vh] overflow-y-auto text-gray-700">
              <div style={{ whiteSpace: "pre-wrap" }}>
                {`
 
SBONSSY  
Ambassador-ehdot 
 
1 MÄÄRITELMÄT 
Alusta tarkoittaa Sbonssyn tuottamaa digitaalista verkkopalvelua, jossa 
Brändit, Ambassadorit ja Fanit voivat olla vuorovaikutuksessa ja toteuttaa 
kampanjoita. 
Ambassador tarkoittaa urheilijaa, vaikuttajaa tai muuta yksityishenkilöä, joka 
toimii Brändin kampanjan lähettiläänä Alustan kautta. 
Brändi tarkoittaa yhtiötä, joka käyttää Alustaa kampanjoiden luomiseen ja 
toteuttamiseen Ambassadorien ja Fanien kautta. 
Fani tarkoittaa Alustan loppukäyttäjää, joka voi altistua kampanjasisällölle ja 
osallistua konversioihin. 
Kampanja tarkoittaa Brändin luomaa ja hallinnoimaa markkinointikokonaisuutta 
Alustalla. 
Konversio tarkoittaa ennalta määriteltyä toimenpidettä, kuten osto, 
rekisteröityminen tai muu mittaroitava toiminto, jonka perusteella maksetaan 
komissio. 
Komissio tarkoittaa Brändin suorittamaa maksua Ambassadorille ja/tai 
Palveluntarjoajalle tulospohjaisesti tapahtuneesta konversiosta. 
Palvelu tarkoittaa kokonaisuutta, jonka Sbonssy Oy tarjoaa Brändille Alustan, 
teknisten toimintojen ja asiakastuen muodossa. 
Palvelupalkkio tarkoittaa Palveluntarjoajalle maksettavaa korvausta 
kampanjan tai konversion toteutumisesta. 
Sopimus tarkoittaa tätä Brändikumppanuussopimusta mukaan lukien kaikki sen 
liitteet ja mahdolliset muutokset. 
UGC (User-Generated Content) tarkoittaa Ambassadorin tai Fanin itse 
tuottamaa sisältöä, kuten tekstiä, kuvaa tai videota, joka liittyy kampanjaan tai 
tuotteeseen. 

Product Gifting tarkoittaa Brändin tarjoamaa tuotenäytettä Ambassadorille, 
jonka vastaanottaminen ja ehdot sovitaan suoraan Brändin ja Ambassadorin 
välillä ilman Palveluntarjoajan osallistumista. 
Stripe Connect tarkoittaa maksupalveluntarjoajaa, jonka kautta kaikki maksut 
ja komissiot käsitellään Alustalla. Stripe vastaa maksujen teknisestä 
välittämisestä ja hallinnoinnista. 
Ylivoimainen este tarkoittaa Osapuolen velvoitteen viivästymistä tai 
täyttämättä jättämistä, jos sen on estänyt tai sitä on kohtuuttomasti 
vaikeuttanut seikka, johon Osapuoli ei ole pystynyt vaikuttamaan, jota Osapuoli 
ei  ole  kohtuudella  voinut  ottaa  huomioon  sopimuksen  tekohetkellä  ja  jonka  
seuraamuksia  Osapuoli  ei  ole  kohtuudella  voinut  välttää  tai  voittaa.  Tällaisia  
seikkoja  voivat  olla  esimerkiksi  valtiovallan  Sopimuksen  mukaisen  suorituksen  
estävät toimenpiteet, lait tai määräykset, tulipalot, tulvat, epidemiat, 
karanteenimääräykset, lakot, työsulut, mellakat, terroriteot tai niiden erityinen 
uhka, yleisen liikenteen tai sähkönjakelun olennainen keskeytys. Lakko, työsulku, 
boikotti tai muu niihin verrattava työtaistelutoimenpide katsotaan 
ylivoimaiseksi esteeksi myös silloin, kun Osapuoli on itse sen kohteena tai siihen 
osallisena.  
Määritellyn sanan yksikkömuoto pitää sisällään asiayhteydestä riippuen 
monikon ja päinvastoin.  
Tässä Sopimuksessa käytetty termi “kirjallisesti” tarkoittaa Osapuolten 
allekirjoittamaa  asiakirjaa  tai  kirjettä,  sähköpostia  taikka  muuta  Osapuolten  
sopimaa tapaa. 

2 EHTOJEN TAUSTA, TARKOITUS JA TAVOITTEET  
2.1 Tämä Sopimus luo perustan yhteistyölle Sbonssy Oy:n ja Ambassadorin 
välillä,  kun  Ambassador  liittyy  Sbonssy-alustan  vaikuttajaverkostoon  
markkinoidakseen Brändikumppaneiden tuotteita ja palveluita 
digitaalisesti. 
2.2 Sbonssy on digitaalinen markkinointialusta, joka yhdistää Brändit, 
Ambassadorit  ja  Fanit  tulospohjaisen  vaikuttajamarkkinoinnin  keinoin.  
Ambassador toimii alustalla itsenäisenä sisällöntuottajana, joka 
osallistuu  Brändien  kampanjoihin  ja  luo  kohdeyleisöään  puhuttelevaa  
sisältöä esimerkiksi sosiaalisen median kanavissa. 
2.3 Sopimuksen tavoitteena on: 
2.3.1  Mahdollistaa läpinäkyvä ja reilu yhteistyömalli vaikuttajalle 
2.3.2 Määrittää selkeästi Osapuolten roolit, vastuut ja oikeudet 
2.3.3 Varmistaa, että kaikki sisällöntuotanto noudattaa 
lainsäädäntöä ja alustan arvoja 
2.3.4 Edistää turvallista ja tehokasta vaikuttajamarkkinointia 
teknisesti ja kaupallisesti yhtenäisellä mallilla 
2.4 Ambassador  ei  ole  työsuhteessa  Sbonssyyn  tai  Brändiin,  vaan  toimii  
omissa nimissään ja omaan lukuunsa, sitoutuen kuitenkin alustan ehtoihin 
ja kampanjakohtaisiin sopimuksiin. 
3 AMBASSADORIN OIKEUDET JA VELVOLLISUUDET 
3.1 Tässä osiossa määritellään Ambassadorin keskeiset oikeudet ja 
velvollisuudet Sbonssy-alustalla toimiessaan. Ambassador toimii 
itsenäisenä sisällöntuottajana ja vaikuttajana, jolla on oikeus hyödyntää 
alustaa kampanjoihin osallistumiseen sekä oman näkyvyytensä 
rakentamiseen. Samalla Ambassador sitoutuu toimimaan 
ammattimaisesti ja Sbonssyn arvojen ja sääntöjen mukaisesti. 
3.2 Ambassadorin on oltava vähintään 16-vuotias.  
3.3 Ambassador on velvollinen toimittamaan ikää tai henkilöllisyyttä 
vahvistavia  tietoja  sillä  uhalla,  että  Palvelutarjoaja  voi  kieltäytyä  tilin  
avaamisesta  tai  poistaa  olemassa  olevan  tilin,  jos  ehtoja  rikotaan  tai  
rekisteröitymisessä ilmenee epäselvyyksiä. 
3.4 Ambassador luo ja hallinnoi omaa profiiliaan Alustalla. 
3.5 Ambassador voi liittyä kampanjoihin, joita Brändit julkaisevat Alustalla. 

3.6 Ambassador tuottaa omaa sisältöä (UGC), kuten videoita, kuvia ja 
tekstejä. 
3.7 Ambassador sitoutuu siihen, että kaikki sisältö on hyvän tavan mukaista, 
lainmukaista  sekä  mainonnan  tunnistettavuuden  osalta  oikein  merkitty  
(esim. #mainos, #yhteistyö). 
3.8 Ambassador on vastuussa omien verojen, eläkemaksujen ja muiden 
lakisääteisten velvoitteiden hoitamisesta. 
3.9 Ambassador sitoutuu noudattamaan Brändin mahdollisia ohjeistuksia ja 
hyväksymään sisällön ennakkotarkastuksen, jos siitä on erikseen sovittu 
kampanjan yhteydessä. 
3.10 Ambassadorilla ei ole oikeutta olla suoraan yhteydessä 
Brändikumppaniin,  vaan  kaikki  viestintä  tulee  hoitaa  Palveluntarjoajan  
Alustan välityksellä. 
3.11  Ambassadorilla  on  oikeus  kieltäytyä  osallistumasta  Kampanjaan,  mikäli  
kyseisen tuotteen tai palvelun markkinointi voi hänen perustellun 
arvionsa mukaan aiheuttaa riskin hänen maineelleen tai 
henkilöbrändilleen. 
3.12 Tätä  kieltäytymisoikeutta  voidaan  käyttää  erityisesti  tilanteissa,  joissa  
Ambassador joutuu ulkoisten tekijöiden, kuten negatiivisen julkisen 
kohun tai kriisin, vuoksi vetämään pois tai muokkaamaan julkaistua 
sisältöä. 

4 PALVELUNTARJOAJAN OIKEUDET JA VELVOLLISUUDET 
4.1 Tässä osiossa määritellään Sbonssy Oy:n ("Palveluntarjoaja") keskeiset 
roolit ja vastuut Ambassador-yhteistyön mahdollistajana. 
Palveluntarjoaja ylläpitää ja kehittää Sbonssy-alustaa tarjotakseen 
teknisen ja hallinnollisen ympäristön, jossa Ambassador voi toimia 
turvallisesti, luotettavasti ja tehokkaasti. Palveluntarjoaja ei kuitenkaan 
osallistu Ambassadorin sisällöntuotantoon tai toimi Brändin lukuun, 
vaan toimii itsenäisenä alustan tarjoajana. 
4.2 Palveluntarjoaja mahdollistaa Alustan teknisen toimivuuden ja 
Ambassador-profiilin luomisen. 
4.3 Palveluntarjoajalla on oikeus poistaa Ambassadorin sisältö tai 
Ambassador Alustalta, jos toiminta rikkoo ehtoja, lakia tai brändin 
ohjeistuksia. 
4.4 Palveluntarjoaja  ei  ole  vastuussa  Ambassadorin  tuottamasta  sisällöstä  
eikä sen sisällöstä aiheutuvista seuraamuksista. 
4.5 Palveluntarjoaja  ei  ole  osapuoli  mahdollisissa  Ambassadorin  ja  Brändin  
välisissä erimielisyyksissä tuotenäytteisiin (Product Gifting) liittyen. 

5 KIELTÄYTYMISOIKEUS JA VAIKUTUS PALKKIOON  
5.1 Ambassadorilla on oikeus kieltäytyä osallistumasta kampanjaan tai 
poistaa/muokata aiemmin julkaisemaansa sisältöä, jos hän perustellusti 
katsoo, että kampanja tai sen sisältö voi vahingoittaa hänen mainettaan 
tai henkilöbrändiään. Tätä oikeutta voidaan käyttää erityisesti 
tilanteissa,  joissa  ulkoiset  olosuhteet,  kuten  negatiivinen  julkinen  kohu,  
muuttavat kampanjan luonnetta tai yleistä vastaanottoa tavalla, jota ei 
ollut ennakoitavissa. 
5.2 Kieltäytymisoikeuden käyttäminen ei lähtökohtaisesti vaikuta 
Ambassadorin oikeuteen saada kampanjasta sovittu palkkio, mikäli 
Ambassador on jo osallistunut kampanjaan edellytetyllä tavalla ja 
täyttänyt muut velvoitteensa. 
5.3 Poikkeustilanteissa, joissa kieltäytyminen tapahtuu ennen sisällön 
julkaisua  tai  ilman  perusteltua  syytä,  voidaan  palkkiota  tarkistaa  tai  
jättää maksamatta, mikäli näin on erikseen todettu kampanjan ehdoissa. 
6 SOPIMUKSEN VOIMAANTULO JA KESTO 
6.1 Sopimus  astuu  voimaan,  kun  Ambassador  hyväksyy  sopimuksen  ehdot  
rekisteröityessään Alustalle tai muutoin kirjallisesti vahvistaa 
hyväksyvänsä Sopimuksen. 
6.2 Sopimus on voimassa toistaiseksi. 
6.3 Palveluntarjoajalla on oikeus sulkea Ambassadorin tili välittömästi 
ehtojen, lain tai kolmannen osapuolen ohjeistusten rikkomisen 
yhteydessä. 
6.4 Sopimuksen päättyessä molempien Osapuolten oikeudet ja 
velvollisuudet päättyvät, lukuun ottamatta niitä ehtoja, joiden on 
luonteensa perusteella tarkoitettu jäävän voimaan (esimerkiksi 
immateriaalioikeudet ja tietosuoja). 
6.5 Kumpi tahansa Osapuoli voi päättää Sopimuksen milloin tahansa 
ilmoittamalla siitä kirjallisesti tai poistamalla tilinsä. 
7 PALKKIOT JA MAKSUEHTO 
7.1 Sbonssy alustalla noudatetaan tulospohjaista kompensaatiomallia, jossa 
Ambassadorille  maksetaan  palkkiota  perustuen  Brändikumppaneiden  
kampanjoista syntyneisiin mitattaviin toimiin, kuten ostoihin (CPS), 
rekisteröitymisiin (CPA) tai muihin vastaaviin konversioihin.  
7.2 Palkkiomalli määritellään aina kampanjakohtaisesti, ja Ambassadorilla on 
näkyvyys kunkin kampanjan ehtojen mukaisiin korvauksiin ennen 
osallistumista. 
7.3 Palveluntarjoaja veloittaa jokaisesta onnistuneesta konversiosta 
palvelupalkkion, joka sisältyy Brändin kampanjaan budjetoimaan 
kokonaiskorvaukseen. Ambassadorin osuus konversiopohjaisesta 
korvauksesta näkyy selkeästi kampanjan yhteydessä. Palveluntarjoaja ei 
peri lisäkuluja Ambassadorilta, mutta palkkio voidaan maksaa vasta sen 
jälkeen, kun Brändi on maksanut oman osuutensa ja tapahtuma on 
vahvistettu järjestelmässä. 
7.4 Palkkiot maksetaan Ambassadorille Stripe Connect -maksujärjestelmän 
kautta. Stripe toimii maksunvälittäjänä Brändikumppanin ja 
Ambassadorin välillä.  
7.5 Sekä  Brändikumppanin  että  Ambassadorin  tulee  rekisteröityä  Stripe  
Connect  -käyttäjäksi  ja  toimittaa  tarvittavat  pankki-  ja  henkilötiedot  
turvallista maksuliikennettä varten.  
7.6 Palveluntarjoaja ei säilytä maksutietoja, vaan kaikki maksuliikenne 
tapahtuu Stripen suojattujen järjestelmien kautta, jossa Ambassadorille 
maksetaan palkkiota perustuen Brändien kampanjoista syntyneisiin 
mitattaviin  toimiin,  kuten  ostoihin  (CPS),  rekisteröitymisiin  (CPA)  tai  
muihin vastaaviin konversioihin.  
7.7 Palkkiot maksetaan Ambassadorille Stripe Connect -maksujärjestelmän 
kautta. Stripe toimii maksunvälittäjänä Brändin ja Ambassadorin välillä. 
Ambassadorin tulee rekisteröityä Stripe Connect -käyttäjäksi ja 
toimittaa tarvittavat pankki- ja henkilötiedot turvallista 
maksuliikennettä  varten.  Palveluntarjoaja  ei  säilytä  maksutietoja,  vaan  
kaikki maksuliikenne tapahtuu Stripen suojattujen järjestelmien kautta. 
8 IMMATERIAALIOIKEUDET 
8.1 Immateriaalioikeudet Ambassadorin tuottamaan sisältöön sekä 
Brändikumppanin kampanjamateriaaleihin kuuluvat lähtökohtaisesti 
sisällön alkuperäiselle tuottajalle. Mikäli Ambassador käyttää 
Brändikumppanin toimittamaa materiaalia (esimerkiksi logoja tai 
tuotekuvia), näiden käyttö perustuu erilliseen suostumukseen ja 
lisenssiin. 
8.2 Brändikumppanin  ja  Ambassadorin  välisistä  immateriaalioikeuksista  ja  
mahdollisista laajemmista käyttöoikeuksista sovitaan erikseen 
osapuolten välisessä yhteistyösopimuksessa tai kampanjakohtaisissa 
ehdoissa. 
8.3 Ambassador säilyttää omistusoikeuden kaikkeen itse tuottamaansa 
sisältöön ellei muuta sovita.  
8.4 Ambassador myöntää Palveluntarjoajalle ja kampanjaan liittyvälle 
Brändikumppanille rajoitetun oikeuden käyttää sisältöä kampanjan 
yhteydessä sekä sen dokumentointiin ja markkinointiin. 

8.5 Palveluntarjoaja omistaa kaikki Alustaan liittyvät oikeuden. Palvelun 
sopimus- ja asiakirja-aineksen, neuvontatekstien tai muun sisällön 
laajamittainen saattaminen yleisön saataviin on ehdottomasti kiellettyä. 
Tällaista kiellettyä toimintaa on lisäksi sisällön julkaiseminen esimerkiksi 
verkkosivuilla,  kilpailevassa  palvelussa  tai  muussa  ympäristössä,  jossa  
kolmansilla osapuolilla on pääsy sisältöön tai sen osiin.  
8.6 Alusta,  sen  sisältö  ml.  tekstit,  kuvat  ja  grafiikat,  ovat  Palveluntarjoajan  
tai sen yhteistyökumppaneiden omaisuutta. 
8.7 Kaikki Alustaan ja sisältöön liittyvät immateriaalioikeudet 
(tekijänoikeudet, tavaramerkki- ja mallioikeudet, domain-nimet, 
patentit, tietokantaoikeudet sekä liikesalaisuudet) kuuluvat 
Palveluntarjoajalle tai sen yhteistyökumppaneille. Ambassadorille ei 
myönnetä suoria tai epäsuoria oikeuksia mihinkään 
immateriaalioikeuksiin; 
9 HENKILÖTIETOJEN KÄSITTELY 
9.1 Ambassadorin  henkilötietoja,  kuten  nimi,  yhteystiedot,  maksutiedot  ja  
kampanjakohtaiset osallistumistiedot, käsitellään Sbonssy-alustalla 
sopimuksen täytäntöönpanemiseksi sekä maksuliikenteen, viestinnän ja 
kampanjatoimintojen mahdollistamiseksi. 
9.2 Palveluntarjoaja  toimii  henkilötietojen  rekisterinpitäjänä  ja  käsittelee  
tietoja ainoastaan määriteltyihin tarkoituksiin. Maksuliikenteeseen 
liittyvät  tiedot  käsitellään  Stripe  Connect  -palvelun  kautta,  joka  toimii  
itsenäisenä rekisterinpitäjänä omien käyttöehtojensa ja 
tietosuojakäytäntöjensä mukaisesti. 
9.3 Ambassadorilla  on  oikeus  tarkastaa,  oikaista  tai  poistaa  omia  tietojaan  
tietosuojalainsäädännön mukaisesti. Lisätietoja tietojen käsittelystä on 
saatavilla Sbonssyn tietosuojaselosteessa. 
10  VAHINGONKORVAUKSET JA VASTUUNRAJOITUKSET  
10.1  Kumpikaan Osapuoli ei ole missään vastuussa välillisistä tai epäsuorista 
vahingoista.  
10.2 Vastuunrajoitukset eivät koske:   
i. vahinkoja, jotka ovat aiheutuneet tahallisuudesta tai 
törkeästä tuottamuksesta;   
ii. kohdan 15 salassapitoa koskevien sopimusehtojen 
rikkomisesta aiheutunutta vahinkoa.  

11 SALASSAPITO JA LUOTTAMUKSELLISUUS 
11.1  Ambassador sitoutuu pitämään luottamuksellisina kaikki sellaiset tiedot, 
jotka hän saa tietoonsa yhteistyön aikana ja jotka koskevat 
Palveluntarjoajaa, Brändikumppaneita, kampanjoiden sisältöä tai muuta 
liiketoimintaan liittyvää ei-julkista tietoa. 
11.2  Luottamuksellisuusvelvoite kattaa niin kirjalliset, suulliset kuin 
digitaalisetkin tiedot ja säilyy voimassa viisi (5) vuotta tämän 
sopimuksen päättymisestä riippumatta sopimuksen päättymisen 
syystä. 
11.3  Ambassador ei saa käyttää luottamuksellista tietoa muihin tarkoituksiin 
kuin  tämän  sopimuksen  mukaisten  tehtävien  suorittamiseen  eikä  saa  
luovuttaa  sitä  kolmansille  osapuolille  ilman  Palveluntarjoajan  kirjallista  
suostumusta. 
12 SOPIMUKSEN SIIRTÄMINEN 
12.1  Kummallakaan  Osapuolella  ei  ole  oikeutta  siirtää  Sopimusta  eikä  siihen  
perustuvia oikeuksia tai velvoitteita kolmannelle osapuolelle ilman 
toisen Osapuolen etukäteen antamaa kirjallista lupaa.    
13 SOVELLETTAVA LAKI JA RIIDANRATKAISU 
13.1  Sopimukseen  ja  siitä  johtuviin  riitoihin  sovelletaan  Suomen  lakia,  pois  
lukien sen lainvalintaan liittyvät määräykset.  
13.2 Osapuolet  pyrkivät  ratkaisemaan  kaikki  tähän  Sopimukseen  liittyvät  
riitansa ja vaatimuksena keskinäisin neuvotteluin. 
13.3 Elleivät neuvottelut johda ratkaisuun, riidat ratkaistaan Helsingin 
käräjäoikeudessa. 
14  HYVÄKSYNTÄ 
14.1  Osapuolet vakuuttavat lukeneensa ja ymmärtävänsä tämän Sopimuksen 
sisällön sekä sitoutuvansa noudattamaan sitä. 
14.2 Hyväksymällä nämä ehdot Alustalla Ambassador sitoutuu 
noudattamaan ehtoja kaikilta osin. 
 
 
---------O0O--------- 
Hyväksymällä käyttöehdot käyttäjä sitoutuu toimimaan palvelussa vastuullisesti ja sääntöjen 
mukaisesti.`}
              </div>
            </div>
            <button onClick={closeModal} className="mt-4 text-white primaryBtnPlain">
            {t("close")}
            </button>
          </div>
        </div>
      )}
      <div className="flex justify-between items-center mt-4 mb-3">
        <span>{t("step")} 4/4</span>
        <div>
          <button onClick={prev} className="btn secondaryBtn mr-4">
            {t("back")}
          </button>
          <button
            type="button" // Changed to type="button" to prevent default form submission
            onClick={() => {
              // Explicitly validate terms when submit button is clicked
              formik.setFieldTouched("termsAccepted", true);
              if (formik.values.termsAccepted) {
                formik.handleSubmit();
              }
            }}
            disabled={formik.isSubmitting}
            className={`primaryBtn ${
              !formik.values.termsAccepted ? "cursor-not-allowed opacity-50" : ""
            }`}
          >
            {formik.isSubmitting ? t("step4.submitting") : t("step4.submit")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SocialLogins;
