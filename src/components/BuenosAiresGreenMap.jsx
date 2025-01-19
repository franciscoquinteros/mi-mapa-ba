"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Loader2 } from 'lucide-react';

const BuenosAiresGreenMap = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        comunas: 0,
        puntosVerdes: 0,
        contenedores: 0
    });
    const mapRef = useRef(null);
    const mapContainerRef = useRef(null);
    const layerGroupRef = useRef(null);

    const COLORS = {
        PUNTO_VERDE: '#047857',  // Verde más oscuro
        CONTENEDOR: '#854d0e',   // Amarillo más oscuro
        COMUNA: '#1f2937'        // Gris oscuro
    };

    useEffect(() => {
        const loadLeaflet = async () => {
            if (window.L) return;

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);

            await new Promise((resolve) => {
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                script.onload = resolve;
                document.head.appendChild(script);
            });
        };

        // Modificar la función createPopupContent dentro del useEffect
        const createPopupContent = (feature, type) => {
            const props = feature.properties;
            let content = '<div class="popup-content" style="max-width: 300px; padding: 10px;">';

            switch (type) {
                case 'comuna':
                    content += `
                        <h3 style="font-weight: bold; margin-bottom: 12px; color: ${COLORS.COMUNA}">Comuna ${props.Comuna}</h3>
                        <p style="margin-bottom: 8px"><strong>Nombre:</strong> ${props.Nombre}</p>
                        <p style="margin-bottom: 8px"><strong>ID:</strong> ${props.Id}</p>
                    `;
                    break;
                case 'punto_verde':
                    content += `
                        <h3 style="font-weight: bold; margin-bottom: 12px; color: ${COLORS.PUNTO_VERDE}">Punto Verde</h3>
                        <p style="margin-bottom: 8px"><strong>Nombre:</strong> ${props.Nombre}</p>
                        <p style="margin-bottom: 8px"><strong>ID:</strong> ${props.Id}</p>
                        <p style="margin-bottom: 8px"><strong>Materiales que recibe:</strong> Papel / Cartón / Plástico / Metal / Vidrio</p>
                        <p style="margin-bottom: 8px"><strong>Más Información:</strong> Los materiales deben estar limpios y secos</p>
                    `;
                    break;
                case 'contenedor':
                    content += `
                        <h3 style="font-weight: bold; margin-bottom: 12px; color: ${COLORS.CONTENEDOR}">Contenedor Verde</h3>
                        <p style="margin-bottom: 8px"><strong>Dirección:</strong> ${props.Nombre}</p>
                        <p style="margin-bottom: 8px"><strong>ID:</strong> ${props.Id}</p>
                        <p style="margin-bottom: 8px"><strong>Materiales que recibe:</strong> Papel / Cartón / Plástico / Metal / Vidrio</p>
                        <p style="margin-bottom: 8px"><strong>Más Información:</strong> Los materiales deben estar limpios y secos</p>
                    `;
                    break;
            }

            content += '</div>';
            return content;
        };

        const initMap = async () => {
            if (!mapContainerRef.current || mapRef.current) return;

            try {
                await loadLeaflet();

                // Inicializar mapa
                mapRef.current = L.map(mapContainerRef.current).setView([-34.6037, -58.3816], 12);

                // Agregar capa base
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(mapRef.current);

                // Crear grupo de capas
                layerGroupRef.current = L.layerGroup().addTo(mapRef.current);

                // Cargar datos
                const [comunasRes, puntosRes, contenedoresRes] = await Promise.all([
                    fetch('https://epok.buenosaires.gob.ar/getGeoLayer/?categoria=comunas&formato=geojson&srid=4326'),
                    fetch('https://epok.buenosaires.gob.ar/getGeoLayer/?categoria=puntos_verdes&formato=geojson&srid=4326'),
                    fetch('https://epok.buenosaires.gob.ar/getGeoLayer/?categoria=contenedores_verdes&formato=geojson&srid=4326')
                ]);

                const comunas = await comunasRes.json();
                const puntos = await puntosRes.json();
                const contenedores = await contenedoresRes.json();

                console.log('Estructura Punto Verde:', puntos.features[0]);
                console.log('Estructura Contenedor:', contenedores.features[0]);

                // Actualizar estadísticas
                setStats({
                    comunas: comunas.features.length,
                    puntosVerdes: puntos.features.length,
                    contenedores: contenedores.features.length
                });

                // Agregar comunas
                const comunasLayer = L.geoJSON(comunas, {
                    style: {
                        color: COLORS.COMUNA,
                        weight: 2,
                        opacity: 0.6,
                        fillOpacity: 0.1
                    },
                    onEachFeature: (feature, layer) => {
                        layer.bindPopup(createPopupContent(feature, 'comuna'));
                    }
                }).addTo(layerGroupRef.current);

                // Agregar puntos verdes
                const puntosLayer = L.geoJSON(puntos, {
                    pointToLayer: (feature, latlng) => {
                        return L.circleMarker(latlng, {
                            radius: 8,
                            fillColor: COLORS.PUNTO_VERDE,
                            color: '#fff',
                            weight: 1.5,
                            opacity: 1,
                            fillOpacity: 0.8
                        });
                    },
                    onEachFeature: (feature, layer) => {
                        layer.bindPopup(createPopupContent(feature, 'punto_verde'));
                    }
                }).addTo(layerGroupRef.current);

                // Agregar contenedores
                const contenedoresLayer = L.geoJSON(contenedores, {
                    pointToLayer: (feature, latlng) => {
                        return L.circleMarker(latlng, {
                            radius: 6,
                            fillColor: COLORS.CONTENEDOR,
                            color: '#fff',
                            weight: 1.5,
                            opacity: 1,
                            fillOpacity: 0.8
                        });
                    },
                    onEachFeature: (feature, layer) => {
                        layer.bindPopup(createPopupContent(feature, 'contenedor'));
                    }
                }).addTo(layerGroupRef.current);

                // Agregar control de capas
                const overlayMaps = {
                    "Comunas": comunasLayer,
                    "Puntos Verdes": puntosLayer,
                    "Contenedores": contenedoresLayer
                };

                L.control.layers(null, overlayMaps).addTo(mapRef.current);

            } catch (error) {
                console.error('Error:', error);
            } finally {
                setLoading(false);
            }
        };

        initMap();

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    return (
        <Card className="w-full max-w-6xl">
            <CardHeader>
                <CardTitle>Mapa Verde de Buenos Aires</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-medium text-gray-800">Comunas</h3>
                        <p className="text-2xl font-bold text-gray-600">{stats.comunas}</p>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                        <h3 className="font-medium text-green-800">Puntos Verdes</h3>
                        <p className="text-2xl font-bold text-green-600">{stats.puntosVerdes}</p>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                        <h3 className="font-medium text-yellow-800">Contenedores</h3>
                        <p className="text-2xl font-bold text-yellow-600">{stats.contenedores}</p>
                    </div>
                </div>

                <div ref={mapContainerRef} className="h-96 rounded-lg relative">
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    )}
                </div>

                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium mb-2">Leyenda</h3>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center">
                            <div className="w-4 h-4" style={{ backgroundColor: COLORS.COMUNA, opacity: 0.2, border: `2px solid ${COLORS.COMUNA}` }}></div>
                            <span>Comunas</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COLORS.PUNTO_VERDE }}></div>
                            <span>Puntos Verdes</span>
                        </div>
                        <div className="flex items-center">
                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: COLORS.CONTENEDOR }}></div>
                            <span>Contenedores</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default BuenosAiresGreenMap;