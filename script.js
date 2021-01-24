(function () {
        
    let map;
    let demandPointsFeatGroup;
    let gridPointsFeatGroup;
    let facilitiesFeatGroup;
    let linesFeatGroup;
    let timeoutRef;
    let isRunning = false;

    btnGenerateRnd.onclick = () => {
        let num = inpGenerateRnd.value;
        generateRandomDemandPoints(num);
    }

    btnClear.onclick = () => {
        clear();
    }

    btnStart.onclick = () => {
        if (demandPointsFeatGroup.toGeoJSON().features.length == 0) {
            generateRandomDemandPoints(50);
        }

        let parameters = {};
        parameters.populationNum = parseInt(inpPopulation.value);
        parameters.elite = parseInt(inpElite.value);
        parameters.oddsParam = parseInt(inpFitnessParameter.value);
        parameters.mutation = parseInt(inpMutation.value)/100;
        parameters.facilitiesNum = parseInt(inpFacilities.value);

        let demandPoints = demandPointsFeatGroup.toGeoJSON();
        gridPoints = createGridPoints(demandPoints);

        toggleStartStop('start');
        
        L.geoJSON(gridPoints, {
            pointToLayer: function(geoJsonPoint, latlng) {
                return L.circleMarker(latlng, {radius: 3, stroke: false, color: 'gray', fillOpacity: 0.2});
            } 
        }).addTo(gridPointsFeatGroup);

        start(demandPoints, gridPoints, parameters);
    }

    btnStop.onclick = () => {
        clearTimeout(timeoutRef);
        toggleStartStop('stop');
    }

    start = (demandPoints, gridPoints, parameters) => {
        nextGeneration(1, null, demandPoints, gridPoints, parameters);
    }

    nextGeneration = (generationIndex, population, demandPoints, gridPoints, parameters) => {
        linesFeatGroup.clearLayers();
        facilitiesFeatGroup.clearLayers();

        let generation = new Generation(population, demandPoints, gridPoints, parameters);

        L.geoJSON(generation.best.lines, {weight: 2, color: 'lightgreen'}).addTo(linesFeatGroup);
        for (let i=0; i<generation.best.facilities.length; i++) {
            let gridId = generation.best.facilities[i];
            L.geoJSON(gridPoints.features[gridId], {
                pointToLayer: function(geoJsonPoint, latlng) {
                    return L.circleMarker(latlng, {radius: 7, stroke: false, color: 'deeppink', fillOpacity: 1});
                }
            }).addTo(facilitiesFeatGroup);
        }
        document.querySelector('.generation-info').innerHTML = `
            <h4>generation: ${generationIndex}</h4>
            <h5>p-median length: ${generation.best.pMedianLength.toFixed(3)}</h5>
        `;

        timeoutRef = setTimeout(() => {nextGeneration(generationIndex + 1, generation.population, demandPoints, gridPoints, parameters)}, 200);
    }

    initMap = () => {
        map = L.map('map', {zoomControl: false, attributionControl: false, dragging: false, boxZoom: false, scrollWheelZoom: false})
            .setView([50,0], 13)
            .on('click', (e) => {addDemandPoint(e.latlng);})

        demandPointsFeatGroup = L.featureGroup().addTo(map);
        gridPointsFeatGroup = L.featureGroup().addTo(map);
        facilitiesFeatGroup = L.featureGroup().addTo(map);
        linesFeatGroup = L.featureGroup().addTo(map);
    }

    createGridPoints = (demandPoints) => {
        const gridDistance = 1;
        let convex = turf.convex(demandPoints);
        convex = turf.buffer(convex, gridDistance);
        let bbox = turf.bbox(demandPoints);
        let gridPoints = turf.pointGrid(bbox, gridDistance);
        gridPoints.features = gridPoints.features.filter(gridPoint => turf.booleanContains(convex, gridPoint));
        return gridPoints;
    }

    addDemandPoint = (coords) => {
        if (!isRunning) {
            L.circleMarker(coords).addTo(demandPointsFeatGroup);
        }
    }

    generateRandomDemandPoints = (num) => {
        let bounds = map.getBounds();
        let bboxLine = turf.lineString([[bounds._southWest.lng, bounds._southWest.lat], [bounds._northEast.lng, bounds._northEast.lat]]);
        let bbox = turf.bbox(bboxLine);
        let points = turf.randomPoint(num, {bbox: bbox});
        L.geoJSON(points, {
            pointToLayer: function(geoJsonPoint, latlng) {
                return L.circleMarker(latlng);
            }
        }).addTo(demandPointsFeatGroup);
    }

    clear = () => {
        demandPointsFeatGroup.clearLayers();
        linesFeatGroup.clearLayers();
        facilitiesFeatGroup.clearLayers();
        gridPointsFeatGroup.clearLayers();
        document.querySelector('.generation-info').innerHTML = '';
    }

    toggleStartStop = (condition) => {
        switch (condition) {
            case 'start':
                isRunning = true;
                document.querySelector('#btnStart').style.display = 'none';
                document.querySelector('#btnStop').style.display = 'block';
                document.querySelectorAll('input').forEach(x => x.setAttribute('disabled', true));
                document.querySelectorAll('.btn-demand-points').forEach(x => x.setAttribute('disabled', true)) 
                break;
            case 'stop':
                isRunning = false;
                document.querySelector('#btnStop').style.display = 'none';
                document.querySelector('#btnStart').style.display = 'block';
                document.querySelectorAll('input').forEach(x => x.removeAttribute('disabled'));
                document.querySelectorAll('.btn-demand-points').forEach(x => x.removeAttribute('disabled')) 
                break;
        }
    }

    initMap();

} ());