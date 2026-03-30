"use client";

import SidebarFan from "@/components/SidebarFan";
import { useAuthStore } from "@/store/authStore";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import axios from "axios";
import api from "@/lib/axios";
import Dashboard from "@/components/Dashboard/Dashboard";

const FanHomePage = () => {
  const t = useTranslations("Common");
  const { user } = useAuthStore();
  const [terms, setTerms] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [agreeChecked, setAgreeChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  const [initialCheckComplete, setInitialCheckComplete] = useState(false);

  const checkTerms = async () => {
    try {
      const resp = await api.get("/user/accept-terms");
      if (resp) {
        setTerms(Boolean(resp?.data?.termsAccepted));
      }
    } catch (error) {
      console.error("Error checking terms:", error);
    } finally {
      setInitialCheckComplete(true);
    }
  };

  useEffect(() => {
    if (user && user.role === "fan") {
      checkTerms();
    }
  }, [user]);

  useEffect(() => {
    // Only show modal after initial check is complete and terms are false
    if (initialCheckComplete && !terms) {
      setShowModal(true);
    }
  }, [terms, initialCheckComplete]);

  useEffect(() => {
    if (showModal) {
      const prevOverflow = document.body.style.overflow;
      const prevTouchAction = document.body.style.touchAction;
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none"; // improves iOS scroll lock
      return () => {
        document.body.style.overflow = prevOverflow;
        document.body.style.touchAction = prevTouchAction;
      };
    }
  }, [showModal]);

  const handleAcceptTerms = async (val) => {
    if (!val) return;
    setLoading(true);
    try {
      const resp = await api.post("/user/accept-terms");
      if (resp?.success) {
        setTerms(Boolean(resp.data.termsAccepted));
      }
      setShowModal(false);
      setAgreeChecked(false);
    } catch (error) {
      console.error("Failed to accept terms:", error);
      alert("Failed to accept terms. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col bg-gray-100">
      <div className="flex flex-1 relative">
        <div className="hidden lg:block h-fit">
          <SidebarFan />
        </div>
        
         <div className="flex-1 flex flex-col p-4 overflow-auto items-center mt-8">
          {/* <h1 className="text-2xl font-bold text-gray-800">
            {t("heading")}</h1> */}

          <Dashboard role="fan" />
        </div>
      </div>
      {/* ✅ Custom Modal - Only show after initial check */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl p-6 shadow-lg">
            <h2 className="text-xl font-bold mb-4">
              PALVELUN KÄYTTÖEHDOT FANEILLE
            </h2>
            <div className="max-h-64 overflow-y-auto text-gray-700 mb-4">
              <div style={{ whiteSpace: "pre-wrap" }}>
                {`
 
 
SBONSSY 
PALVELUN KÄYTTÖEHDOT FANEILLE 
Sbonssy-palvelun käyttöehdot faneille 
 
Voimassa alkaen: 01.09.2025 
Nämä käyttöehdot ("Ehdot") koskevat yksityishenkilöiden ("Fanien") käyttöä Sbonssy Oy:n 
("Sbonssy" tai "Palveluntarjoaja") tarjoamassa digitaalisessa palvelussa ("Alusta"). 
Rekisteröitymällä tai käyttämällä Alustaa Fani sitoutuu noudattamaan näitä Ehtoja. 
 
1 Rekisteröityminen ja käyttäjätili 
1.1 Palvelun käyttäminen edellyttää vähintään 16 vuoden ikää. Palveluntarjoajalla on oikeus 
pyytää ikää todentavia tietoja ja poistaa alle ikärajan olevien käyttäjien tilit. 
1.2 Käyttäjän on luotava henkilökohtainen tili käyttäessään Palvelua, ja tili on 
henkilökohtainen eikä siirrettävissä toiselle henkilölle. 
1.3 Fani  vastaa  antamiensa  henkilö-  ja  maksutietojen  paikkansapitävyydestä  sekä  tilinsä  
käytöstä. 
1.4 Fani sitoutuu siihen, ettei anna tunnuksiaan muiden käyttöön eikä käytä toisen henkilön 
tiliä ilman lupaa. 
1.5 Rekisteröityminen  edellyttää  maksutietojen  ja  evästeiden/trackauksen  hyväksymistä  
sekä näiden käyttöehtojen noudattamista. 
1.6 Fani vastaa antamiensa henkilö- ja maksutietojen paikkansapitävyydestä. 
1.7 Rekisteröityminen edellyttää maksutietojen ja evästeiden/trackauksen hyväksymistä. 
 
 
2 PALVELUN SISÄLTÖ JA TOIMINTA  
2.1 Alusta toimii vaikuttajavetoisena affiliate-markkinointialustana, jossa Fanit voivat 
seurata suosikkibrändiensä ja Ambassadorien kampanjoita. 
2.2 Kampanjat  sisältävät  kaupallista  sisältöä  ja  niihin  liittyviä  seurantalinkkejä  (affiliate-
linkit), joiden kautta Fani voi tehdä ostopäätöksiä. 
2.3 Ostot  voivat  tuottaa  komissiota  Ambassadorille,  Palveluntarjoajalle  ja  mahdollisesti  
muille järjestelmässä määritellyille osapuolille. 
2.4 Palvelussa  esitetyt  sisällöt  voivat  sisältää  tunnisteita  kuten  #mainos  tai  #yhteistyö,  
joiden avulla mainonnan tunnistettavuus toteutetaan lain mukaisesti. ja -
ambassadoreitaan sekä reagoida kampanjoihin. 
2.5 Palvelu sisältää kaupallista sisältöä ja affiliate-linkkejä. 
2.6 Fanin tekemät ostot voivat tuottaa komissiota Ambassadorille tai Palveluntarjoajalle. 
 
3 FANIN VASTUUT 
3.1 Fani  sitoutuu  olemaan  käyttämättä  Alustaa  lainvastaiseen,  vilpilliseen  tai  hyvän  tavan  
vastaiseen tarkoitukseen. 
3.2 Fani ei saa levittää roskapostia, haitallista sisältöä tai loukkaavaa materiaalia Alustalla. 
3.3 Käyttöehtojen rikkominen voi johtaa tilin sulkemiseen ja vahingonkorvausvastuuseen. 
 
4 IMMATERIAALIOIKEUDET 
4.1 Kaikki Alustan sisältö ja ohjelmisto ovat Sbonssy Oy:n tai kolmansien 
oikeudenhaltijoiden omaisuutta. 
4.2 Fani saa henkilökohtaiseen käyttöön rajoitetun oikeuden tarkastella sisältöä Alustalla. 
 

5 EVÄSTEET JA SEURANTA  
5.1 Fani  hyväksyy,  että  Palveluntarjoaja  voi  käyttää  evästeitä  ja  affiliate-trackereita 
markkinoinnin mittaamiseksi, personoidun sisällön tarjoamiseksi ja 
käyttökokemuksen kehittämiseksi. 
5.2 Evästeet voivat sisältää teknisiä, analyyttisiä ja mainontaan liittyviä komponentteja. 
5.3 Fani  voi  hallinnoida  evästeasetuksiaan  selaimen  kautta  tai  erillisen  evästebannerin  
kautta Alustalla. 
5.4 Lisätiedot evästeiden käytöstä löytyvät Palveluntarjoajan evästekäytännöstä ja 
tietosuojaselosteesta. ja affiliate-trackereita markkinoinnin mittaamiseksi. 
5.5 Lisätiedot käytöstä löytyvät evästekäytännöstä ja tietosuojaselosteesta. 
 
6 VASTUUNRAJOITUKSET 
6.1 Palvelu tarjotaan "sellaisenaan" ilman takuuta. 
6.2 Sbonssy ei vastaa välittömistä tai välillisistä vahingoista tai virheellisestä sisällöstä. 
 
7 TIETOSUOJA 
7.1 Henkilötietoja käsitellään EU:n yleisen tietosuoja-asetuksen (GDPR) ja muun 
soveltuvan lainsäädännön mukaisesti. 
7.2 Fani antaa suostumuksensa henkilötietojen käsittelyyn rekisteröitymisen ja Palvelun 
käytön yhteydessä. 
7.3 Palveluntarjoaja toimii rekisterinpitäjänä ja käsittelee tietoja vain määriteltyihin 
käyttötarkoituksiin, kuten asiakassuhteen hallintaan, viestintään ja palvelun 
kehittämiseen. 
7.4 Fani voi pyytää tietojen tarkastamista, oikaisua, siirtoa tai poistamista 
tietosuojalainsäädännön mukaisesti. 
7.5 Lisätiedot henkilötietojen käsittelystä löytyvät Palveluntarjoajan 
tietosuojaselosteesta. 
7.6 Fani voi pyytää tietojen tarkastamista, oikaisua tai poistamista. 
 

8 MUUT EHDOT 
8.1 Palveluntarjoaja voi päivittää näitä ehtoja ilmoittamalla siitä Alustalla. 
8.2 Ehtojen olennaisista muutoksista tiedotetaan erikseen. 
 
9 SOVELLETTAVA LAKI JA RIIDANRATKAISU 
9.1 Ehtoihin sovelletaan Suomen lakia. 
9.2 Riidat pyritään ratkaisemaan ensisijaisesti neuvotteluin, toissijaisesti 
kuluttajariitalautakunnassa tai Helsingin käräjäoikeudessa. 
 
 
 
 
----------O0O---------- 
 
Hyväksymällä ehdot Fani sitoutuu noudattamaan Palvelun ehtoja ja toimimaan vastuullisesti 
alustayhteisössä. 
 
 
 
 
 
 `}
              </div>
            </div>
            <div className="flex items-center">
              <input
                id="termsCheckbox"
                type="checkbox"
                className="mr-2"
                checked={agreeChecked}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setAgreeChecked(checked);
                  handleAcceptTerms(checked);
                }}
              />
              <label htmlFor="termsCheckbox">
                Olen lukenut ja hyväksyn faniprofiilin ehdot.
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FanHomePage;
