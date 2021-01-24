/*

    -----EXPLANATION-----

    *population*
    An array of individuals. Each individual is an array of genes.
    A gene is a number representing facility location (gridPoint geoJSON feature index).
    If Generation constructor is called recursively, population can be null first time (a random population will be created as first generation).

    *demandPoints*
    A geoJSON of demand points

    *gridPoints*
    A geoJSON of all candidate points that can be chosen an facilities.

    *parameters* (genetic algorithm parameters)
    populationNum: the number of individuals that population consists of
    elite: the number of best individuals to be passed to next generation as they are.
    mutation: the possibility (%) of a gene to be mutated.
    oddsParam: a parameter that enhances individual's fitness (exponent of fitness)
    facilitiesNum: number of individual's genes (number of facilities to be located)

    -----TYPES-----

    population: null | number[][]

    demandPoints: geoJSON

    gridPoints: geoJSON

    parameters: {
        populationNum: number
        elite: number
        mutation: number
        oddsParam: number
        facilitiesNum: number
    }

*/

function Generation(population, demandPoints, gridPoints, parameters) {

    this._init = () => {
        if (!population) {
            population = this._initPopulation();
        } else {
            population = population.map(x => {return {points: x}});
        }
    
        for (let i=0; i<population.length; i++) {
            population[i]['fitness'] = this._fitness(population[i]).score;
        }
        population = _.orderBy(population, 'fitness', 'desc');
    
        population[0]['cumulativeFitness'] = population[0].fitness;
        for (let i=1; i<population.length; i++) {
            population[i]['cumulativeFitness'] = population[i-1].cumulativeFitness + population[i].fitness;
        }
    
        let newPopulation = [];
        for (let i=0; i<parameters.elite; i++) {
            newPopulation.push(population[i]);
        }
    
        while (newPopulation.length < population.length) {
            let parents = this._selectParents(population);
            let children = this._crossover(parents);
            children = this._mutate(children);
            newPopulation.push({points: children[0]});
            newPopulation.push({points: children[1]});
        }

        for (let i=0; i<newPopulation.length; i++) {
            newPopulation[i]['fitness'] = this._fitness(newPopulation[i]);
        }
        let best = _.maxBy(newPopulation, 'fitness');
        let indexOfBest = _.indexOf(newPopulation, best);

        this.population = newPopulation.map(x => x.points);
        this.best = {
            facilities: newPopulation[indexOfBest].points,
            lines: best.fitness.lines,
            pMedianLength: best.fitness.pMedianLength
        }
    }

    this._mutate = (children) => {
        for (let i=0; i<children.length; i++) {
            for (let j=0; j<children[0].length; j++) {
                let rnd = Math.random();
                if (rnd < parameters.mutation) {
                    let randomGene;
                    do {
                        randomGene = Math.floor(Math.random()*gridPoints.features.length);
                    } while (_.includes(children[i], randomGene));
                    children[i][j] = randomGene;
                }
            }
        }
        return children;
    }

    this._crossover = (parents) => {
        let childA = [];
        let childB = [];
    
        for (let i=0; i<Math.floor(parents[0].points.length / 2); i++) {
            childA.push(parents[0].points[i]);
            childB.push(parents[1].points[i]);
        }
    
        for (let i=Math.floor(parents[0].points.length / 2); i<parents[0].points.length; i++) {
            childA.push(parents[1].points[i]);
            childB.push(parents[0].points[i]);
        }
    
        return [childA, childB];
    }

    this._selectParents = (population) => {
        let parentA;
        let parentB;
        let indexOfParentA;
        let indexOfParentB;
    
        let rnd = Math.random()*population[population.length - 1].cumulativeFitness;
        for (let i=0; i<population.length; i++) {
            if (rnd < population[i].cumulativeFitness) {
                parentA = population[i];
                indexOfParentA = i;
                break;
            }
        }
    
        do {
            rnd = Math.random()*population[population.length - 1].cumulativeFitness;
            for (let i=0; i<population.length; i++) {
                if (rnd < population[i].cumulativeFitness) {
                    parentB = population[i];
                    indexOfParentB = i;
                    break;
                }
            }
        } while (indexOfParentA == indexOfParentB);
    
        return [parentA, parentB];
    }

    this._fitness = (individual) => {
        let pMedianLength = 0;
        let lines = [];
    
        for (let i=0; i<demandPoints.features.length; i++) {
            let dist = Infinity;
            let pointA = demandPoints.features[i];
            let connectedFacility;
            for (let j=0; j<individual.points.length; j++) {
                let pointB = gridPoints.features[individual.points[j]];
                let d = turf.distance(pointA, pointB);
                if (d < dist) {
                    dist = d;
                    connectedFacility = pointB;
                }
            }
            lines.push(turf.lineString([pointA.geometry.coordinates, connectedFacility.geometry.coordinates]));
            pMedianLength += dist;
        }
        let score = 1/pMedianLength;
        score = Math.pow(score, parameters.oddsParam);
        return {score: score, lines: lines, pMedianLength: pMedianLength};
    }

    this._initPopulation = () => {
        let population = [];
        for (let i=0; i<parameters.populationNum; i++) {
            let individual = {points: []};
            for (let j=0; j<parameters.facilitiesNum; j++) {
                let gene;
                do {
                    gene = Math.floor(Math.random()*gridPoints.features.length);
                } while (_.includes(individual, gene));
                individual.points.push(gene);
            }
            population.push(individual);
        }
        return population;
    }

    this._init();
}
