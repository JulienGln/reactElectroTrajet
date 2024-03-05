import React, { useEffect, useRef, useState } from "react";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-routing-machine";
import "leaflet-routing-machine/dist/leaflet-routing-machine.css";

export default function Map({ villes, giveInfosTrajet }) {
  const mapRef = useRef(null); // éviter de s'afficher plusieurs fois

  const icon_marker = {
    icon: L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconSize: [25, 41],
    }),
  };
  const icon_marker_borne = {
    icon: L.icon({
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      iconSize: [25, 41],
    }),
  };

  /**
   * Initialisation de la map
   */
  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map("map", { zoom: 5 }).setView(
        [
          (villes.villeA.lat + villes.villeB.lat) / 2,
          (villes.villeA.lon + villes.villeB.lon) / 2,
        ],
        5
      );

      const tileLayer = L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
          attribution: "© OpenStreetMap contributors",
        }
      );

      tileLayer.on("load", function () {
        // La carte est entièrement chargée
        mapRef.current.invalidateSize();
      });
      tileLayer.addTo(mapRef.current);
    }

    // Ajout d'un écouteur d'événements pour le zoom
    mapRef.current.on("zoomend", function () {
      // Ajuster la taille de la carte après le zoom
      mapRef.current.invalidateSize();
    });
  }, []);

  /**
   * Ajout des villes sur la carte
   */
  useEffect(() => {
    if (mapRef.current) {
      addVilleAAndVilleB(mapRef);
      fetchTrajet();
    }
  }, [mapRef.current]);

  /**
   * Ajoute à la carte les marqueurs de départ et d'arrivée
   * @param mapRef la carte
   */
  function addVilleAAndVilleB(mapRef) {
    // deux marqueurs
    const coordsVilleA = villes.villeA;
    const marker1 = L.marker(
      [coordsVilleA.lat, coordsVilleA.lon],
      icon_marker
    ).addTo(mapRef.current);
    const coordsVilleB = villes.villeB;
    const marker2 = L.marker(
      [coordsVilleB.lat, coordsVilleB.lon],
      icon_marker
    ).addTo(mapRef.current);

    // ligne de trajet entre les deux marqueurs
    const latlngs = [marker1.getLatLng(), marker2.getLatLng()];
    // Ajuster la vue pour inclure les deux marqueurs
    const bounds = L.latLngBounds(latlngs);
    mapRef.current.fitBounds(bounds);
  }

  /**
   * Récupère les bornes prêt d'un point (lat, lon), dans un rayon en km donné (radius)
   */
  async function fetchBornesNearPoint(lat, lon, radius) {
    //const proxyUrl = `http://localhost:3001/proxy?lat=${lat}&lon=${lon}&radius=${radius}`;
    const point = "POINT(" + lat + " " + lon + ")";
    const apiUrl =
      "https://odre.opendatasoft.com/api/explore/v2.1/catalog/datasets/bornes-irve/records?limit=1&where=(distance(`geo_point_borne`, geom'" +
      point +
      "', " +
      radius +
      "m))";
    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`Erreur de l'API: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des bornes électriques :",
        error
      );
      throw error;
    }
  }

  function fetchTrajet() {
    var trajet = L.routing.control({
      waypoints: [
        L.latLng(villes.villeA.lat, villes.villeA.lon),
        L.latLng(villes.villeB.lat, villes.villeB.lon),
      ],
      routeWhileDragging: true,
      addWaypoints: false,
      show: false,
      draggableWaypoints: false,
    });

    // Dès qu'un itinéraire est trouvé :
    trajet.on("routesfound", async function (e) {
      var route = e.routes[0];
      var tempsDeTrajet = route.summary.totalTime; // Temps de trajet en secondes
      var distanceKm = route.summary.totalDistance / 1000; // distance du trajet en km
      var points = route.coordinates; // tous les points qui composent le trajet

      console.log("Points du trajet : " + points.length);
      const radius = 30 * 1000; // rayon en kilomètres
      var bornesProches = [];

      // Récupération des bornes tous les 100 points du trajet
      for (let i = 0; i < points.length; i += Math.floor(points.length / 100)) {
        const result = await fetchBornesNearPoint(
          points[i].lat,
          points[i].lng,
          radius
        );
        if (result.results.length > 0) bornesProches.push(result.results);
      }

      // Ajout des bornes sur la carte
      for (let i = 0; i < bornesProches.length; i++) {
        const borne = bornesProches[i];
        if (
          borne[0] !== undefined &&
          borne[0].ylatitude !== undefined &&
          borne[0].xlongitude !== undefined
        ) {
          L.marker(
            [borne[0].xlongitude, borne[0].ylatitude],
            icon_marker_borne
          ).addTo(mapRef.current);
        }
      }

      var heures = Math.floor(tempsDeTrajet / 3600);
      var minutes = Math.floor((tempsDeTrajet % 3600) / 60);
      var vitesse_moyenne = distanceKm / (heures + minutes / 60);

      // Transmission des infos à homePage.jsx pour appel à SOAP
      giveInfosTrajet({
        distance: distanceKm,
        vitesseMoyenne: vitesse_moyenne.toPrecision(4),
        vehicule: villes.vehicule,
      });
    });

    trajet.addTo(mapRef.current);
  }

  return (
    <div
      id="map-container"
      style={{
        height: "500px",
        width: "50%",
        maxWidth: "50%",
        maxHeight: "500px",
        overflow: "hidden",
      }}
      className="shadow-sm rounded"
    >
      <p className="visually-hidden">{JSON.stringify(villes)}</p>
      <div
        id="map"
        style={{
          height: "100vh",
          width: "100%",
        }}
        className="border rounded"
      ></div>
    </div>
  );
}
