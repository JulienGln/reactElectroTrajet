import React, { useState, useEffect } from "react";
import Select from "react-select";
import axios from "axios";

export default function FormTrajet({ giveCoordsToMap, infosTrajet }) {
  const [searchTerm, setSearchTerm] = useState(""); // texte de l'input de la ville de départ
  const [searchResults, setSearchResults] = useState([]); // résultats de l'API des communes en rapport avec searchTerm
  const [searchTermB, setSearchTermB] = useState(""); // texte de l'input de la ville d'arrivée
  const [searchResultsB, setSearchResultsB] = useState([]); // résultats de l'API des communes en rapport avec searchTermB
  const [coordsVilleA, setCoordsVilleA] = useState(null); // coordonnées ville A et B
  const [coordsVilleB, setCoordsVilleB] = useState(null);
  const [optionsVilles, setOptionsVilles] = useState([]);
  const [optionsVehicules, setOptionsVehicules] = useState([]);
  const [vehicules, setVehicules] = useState([]); // les véhicules fournies via graphQL et leurs infos
  const [vehicule, setVehicule] = useState(null); // le véhicule choisi dans le select du formulaire (id + nom)
  const [isVillesLoading, setIsVillesLoading] = useState(true);
  const [hasErrors, setHasErrors] = useState(false);
  const [infoZoneRurale, setInfoZoneRurale] = useState(false);
  const [disableInputs, setDisableInputs] = useState(false); // lorsque la map est affichée, les inputs sont désactivées

  /**
   * Formate les données JSON de l'API pour le composant React Select
   * @param {JSON} villes les villes renvoyées par l'API
   */
  function formatageVilles(villes) {
    var res = [];
    for (let i = 0; i < villes.length; i++) {
      //villes[i].population >= 3000 && // si on veut limiter aux plus grandes villes
      res.push({ value: villes[i].nom, label: villes[i].nom });
    }
    setOptionsVilles(res);
  }

  /**
   * Formate les données JSON de l'API pour le composant React Select
   * @param {JSON} vehicules les véhicules renvoyées par l'API
   */
  function formatageVehicules(vehicules) {
    var res = [];
    for (let i = 0; i < vehicules.length; i++) {
      res.push({
        value: vehicules[i].id,
        label: vehicules[i].naming.make + " " + vehicules[i].naming.model,
      });
    }
    setOptionsVehicules(res);
  }

  function handleSearchChange(e) {
    const term = e.target.value;
    setSearchTerm(term);

    const results = optionsVilles.filter((ville) =>
      ville.label.toLowerCase().includes(term.toLowerCase())
    );

    term !== "" ? setSearchResults(results) : setSearchResults([]);
  }

  function handleSearchBChange(e) {
    const term = e.target.value;
    setSearchTermB(term);

    const results = optionsVilles.filter((ville) =>
      ville.label.toLowerCase().includes(term.toLowerCase())
    );

    term !== "" ? setSearchResultsB(results) : setSearchResultsB([]);
  }

  function handleVehiculeChange(event) {
    setVehicule(event.value);
  }

  /**
   * Recherche les coordonnées d'une ville avec une API du gouvernement
   * @param {string} position "départ" ou "arrivée"
   */
  function handleChangeCoordsVille(position) {
    const query = position === "départ" ? searchTerm : searchTermB;
    const apiUrl = `https://api-adresse.data.gouv.fr/search/?q=${query}&type=municipality&limit=1`;

    fetch(apiUrl)
      .then((response) => response.json())
      .then((data) => {
        if (data.features.length > 0) {
          const firstResult = data.features[0];
          const coords = firstResult.geometry.coordinates;

          const latitude = coords[1];
          const longitude = coords[0];

          if (firstResult.properties.population < 1000) {
            setInfoZoneRurale(true);
          } else {
            setInfoZoneRurale(false);
          }

          if (position === "départ") {
            setCoordsVilleA({ lat: latitude, lon: longitude });
          } else {
            setCoordsVilleB({ lat: latitude, lon: longitude });
          }
        } else {
          console.log("Aucun résultat trouvé pour la ville spécifiée.");
        }
      })
      .catch((error) => {
        console.error("Erreur lors de la requête API Adresse", error);
        setInfoZoneRurale(true);
      });
  }

  function handleSubmitForm(event) {
    event.preventDefault(); // évite le rechargement de la page
    // transmission des coordonnées à la map une fois les deux villes renseignées
    if (coordsVilleA && coordsVilleB) {
      setHasErrors(false);
      setInfoZoneRurale(false);
      setDisableInputs(true);
      giveCoordsToMap({
        villeA: coordsVilleA,
        villeB: coordsVilleB,
        vehicule: vehicules.find((car) => car.id === vehicule),
      });
    } else {
      setHasErrors(true);
    }
  }

  // Récupération des communes de France
  useEffect(() => {
    // fetch("https://geo.api.gouv.fr/departements/73/communes") => pour tester
    fetch("https://geo.api.gouv.fr/communes")
      .then((response) => response.json())
      .then((data) => {
        formatageVilles(data);
        setIsVillesLoading(false); // Les données sont récupérées, on met isLoading à false
      })
      .catch((error) => {
        console.error("Erreur lors de la récupération des données :", error);
        setIsVillesLoading(false); // Il y a eu une erreur, on met quand même isLoading à false
      });
  }, []);

  // récup des véhicules électriques
  useEffect(() => {
    const apiUrl =
      "https://electro-trajet-server.azurewebsites.net/vehicle-list";

    const fetchVehicles = async () => {
      try {
        const res = await axios.get(apiUrl);
        setVehicules(res.data);
        formatageVehicules(res.data);
      } catch (error) {
        console.error(`Error: ${error}`);
      }
    };

    fetchVehicles();
  }, []);

  return (
    <div>
      <form className="form-floating" onSubmit={handleSubmitForm}>
        {!isVillesLoading ? (
          <div id="villes">
            <div className="form-floating m-3">
              <input
                id="villeA"
                required
                type="search"
                autoComplete="off"
                placeholder="Départ"
                className={`form-control shadow-sm ${
                  searchTerm === "" || searchResults.length > 0
                    ? searchResults.length > 0 && "is-invalid"
                    : "is-valid"
                }`}
                onChange={handleSearchChange}
                value={searchTerm}
                disabled={disableInputs}
              />
              <label htmlFor="villeA">Départ</label>
              <ul
                style={{
                  listStyle: "none",
                  width: "100%",
                  borderRadius: "4px",
                  overflow: "auto",
                  maxHeight: "200px",
                }}
              >
                {searchResults
                  .sort((a, b) => {
                    return a.label.length - b.label.length;
                  })
                  .map(
                    (result, index) =>
                      index < 10 && (
                        <li
                          key={index}
                          onClick={() => {
                            setSearchTerm(result.label);
                            setSearchResults([]);
                            handleChangeCoordsVille("départ");
                          }}
                          style={{
                            cursor: "pointer",
                            padding: "10px",
                            backgroundColor:
                              index % 2 === 0 ? "#f6f6f6" : "#fff",
                            borderBottom: "1px solid lightgray",
                          }}
                        >
                          {result.label}
                        </li>
                      )
                  )}
              </ul>
            </div>
            <div className="form-floating m-3">
              <input
                id="villeB"
                required
                type="search"
                autoComplete="off"
                placeholder="Arrivée"
                className={`form-control shadow-sm ${
                  searchTermB === "" || searchResultsB.length > 0
                    ? searchResultsB.length > 0 && "is-invalid"
                    : "is-valid"
                }`}
                onChange={handleSearchBChange}
                value={searchTermB}
                disabled={disableInputs}
              />
              <label htmlFor="villeB">Arrivée</label>
              <ul
                style={{
                  listStyle: "none",
                  width: "100%",
                  borderRadius: "4px",
                  overflow: "auto",
                  maxHeight: "200px",
                }}
              >
                {searchResultsB
                  .sort((a, b) => {
                    return a.label.length - b.label.length;
                  })
                  .map(
                    (result, index) =>
                      index < 10 && (
                        <li
                          key={index}
                          onClick={() => {
                            setSearchTermB(result.label);
                            setSearchResultsB([]);
                            handleChangeCoordsVille("arrivée");
                          }}
                          style={{
                            cursor: "pointer",
                            padding: "10px",
                            backgroundColor:
                              index % 2 === 0 ? "#f6f6f6" : "#fff",
                            borderBottom: "1px solid lightgray",
                          }}
                        >
                          {result.label}
                        </li>
                      )
                  )}
              </ul>
            </div>
          </div>
        ) : (
          <>
            <div className="spinner-border text-primary" role="status"></div>
            <br />
            <span className="fw-bold">
              Chargement des communes de France...
            </span>
          </>
        )}

        <div className="m-3">
          {vehicules.length > 0 ? (
            <Select
              placeholder="Véhicule"
              id="vehicule"
              required
              noOptionsMessage={() => {
                return "Aucune véhicule disponible...";
              }}
              options={optionsVehicules}
              onChange={handleVehiculeChange}
              isDisabled={disableInputs}
              className="shadow-sm"
            />
          ) : (
            <>
              <div className="spinner-border text-primary" role="status"></div>
              <br />
              <span className="fw-bold">Chargement des véhicules...</span>
            </>
          )}
        </div>
        {vehicule && (
          <img
            className="img-thumbnail rounded mb-2"
            src={
              vehicules.find((car) => car.id === vehicule).media.image
                .thumbnail_url
            }
            alt="un véhicule électrique"
          />
        )}
        <br />
        <button
          className="btn btn-success shadow-sm"
          type="submit"
          disabled={!coordsVilleA || !coordsVilleB || !vehicule}
        >
          Valider
        </button>
      </form>
      {hasErrors && (
        <div
          className="alert alert-danger mt-4 mx-5 align-items-center shadow-sm"
          role="alert"
        >
          Les données des villes ne sont pas correctes
        </div>
      )}
      {infoZoneRurale && (
        <div
          className="alert alert-info mt-4 mx-5 d-flex align-items-center shadow-sm"
          role="alert"
        >
          Attention : Les coordonnées que vous avez entrées correspondent à un
          lieu isolé ou peu connu. Il se peut que les résultats de la recherche
          soient imprécis ou erronés. Veuillez vérifier la validité des données
          avant de les utiliser. Merci de votre compréhension.
        </div>
      )}
      <div className={"mt-3" + (infosTrajet ? "" : " placeholder-glow")}>
        <p className={"fw-bold" + (infosTrajet ? "" : " placeholder")}>
          {"Temps de trajet : "}
          {infosTrajet &&
            (parseFloat(infosTrajet.temps_trajet) >= 1.0
              ? parseFloat(infosTrajet.temps_trajet).toFixed(2) + " h"
              : (parseFloat(infosTrajet.temps_trajet) * 60).toFixed(0) +
                " min")}
        </p>
        {infosTrajet && (
          <>
            <a
              data-bs-toggle="collapse"
              href="#infosTrajetPlus"
              role="button"
              aria-expanded="false"
              aria-controls="infosTrajetPlus"
            >
              Voir plus d'informations
            </a>
            <div className="collapse" id="infosTrajetPlus">
              <div className="card card-body">
                <ul className="list-group">
                  <li className="list-group-item">
                    Autonomie : {infosTrajet.autonomie} km
                  </li>
                  <li className="list-group-item">
                    Temps de charge complète :{" "}
                    {parseFloat(infosTrajet.tps_chargement).toFixed(2)} h
                  </li>
                  <li className="list-group-item">
                    Distance : {parseFloat(infosTrajet.distance).toFixed(2)} km
                  </li>
                  <li className="list-group-item">
                    Vitesse moyenne :{" "}
                    {parseFloat(infosTrajet.vitesse_moyenne).toFixed(2)} km/h
                  </li>
                </ul>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
