import React, { useState } from "react";
import Map from "../components/Map";
import FormTrajet from "../components/FormTrajet";

export default function Home() {
  const [selectedCoordinates, setSelectedCoordinates] = useState(null);
  const [infosTrajet, setInfosTrajet] = useState(null);

  // et le véhicule aussi
  function getCoordsFromForm(data) {
    setSelectedCoordinates(data);
  }

  function getInfosTrajet(data) {
    /* data : 
    {"temps":14733.9,"distance":367.8192,"vitesseMoyenne":"90.08",
    "vehicule":{"id":"600e964a5fc2ee68bcb1f183","naming":{"make":"Kia","model":"e-Niro","chargetrip_version":"64 kWh (2021 - 2022)"},"media":{"image":{"thumbnail_url":"https://cars.chargetrip.io/6012a20df9c50f63d328b28a-d9a03dddc473b43c8e54e9ff967185d26a95444c.png"}},"battery":{"usable_kwh":64},"range":{"chargetrip_range":{"best":392,"worst":337}}}} */

    // const url = "http://127.0.0.1:8000?wsdl";

    const puissance_borne = 11; // champ "puiss_max" de l'API Borne IRVE
    const args = {
      distance: data.distance,
      autonomie: data.vehicule.range.chargetrip_range.worst,
      vitesse_moyenne: parseFloat(data.vitesseMoyenne),
      tps_chargement: data.vehicule.battery.usable_kwh / puissance_borne, // en heures
    };

    console.log("Infos trajet et véhicules : ", args);

    // appel à SOAP via le serveur proxy
    fetch("http://localhost:3001/soap-proxy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
    })
      .then((response) => response.json())
      .then((data) => {
        console.log("Réponse du service SOAP :", data);
        args["temps_trajet"] = data.temps_trajet;
        setInfosTrajet(args);
      })
      .catch((error) => {
        console.error("Erreur :", error);
      });
  }

  return (
    <div>
      <h1
        style={{
          backgroundColor: "blueviolet",
          color: "white",
          cursor: "pointer",
        }}
        className="p-5 fw-light fs-1"
        onClick={() => window.location.replace(".")}
      >
        Electro'Trajet
      </h1>
      <div className="d-flex flex-column flex-md-row justify-content-around">
        <FormTrajet
          giveCoordsToMap={getCoordsFromForm}
          infosTrajet={infosTrajet}
        />
        {selectedCoordinates && (
          <Map villes={selectedCoordinates} giveInfosTrajet={getInfosTrajet} />
        )}
      </div>
    </div>
  );
}
