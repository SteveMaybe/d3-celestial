/* global d3, Celestial, projections, poles, getData, getPlanet, getMwbackground, getAngles, getWidth, getGridValues, has, isArray, halfπ, symbols, starnames, dsonames, bvcolor, settings, formats, transformDeg, euler, Round */

function dump(done_func) {
    m = Celestial.metrics();
    cfg = settings.set();
    path = cfg.datapath;
    proj = projections[cfg.projection];
    rotation = getAngles(cfg.center);
    center = [-rotation[0], -rotation[1]];
    projection = Celestial.projection(cfg.projection).rotate(rotation).translate([m.width/2, m.height/2]).scale([m.scale]);
    culture = (cfg.culture !== "" && cfg.culture !== "iau") ? cfg.culture : "";
    scale = 1/m.scale;
    adapt = 1;
    var map = d3.geo.path().projection(projection);

    if (proj.clip) {
        projection.clipAngle(90);
    }

    var q = d3.queue(2);

    var raw_data = [];

    const tPoint = (v) => {
        pts = projection(v);
        return [pts[0], pts[1]]
    };

    //Constellation lines
    q.defer(function (callback) {
        d3.json(path + filename("constellations", "lines"), function (error, json) {
            var conl = getData(json, cfg.transform);

            conl.features.forEach(v => {
                v.geometry.coordinates.forEach(inner => {
                    let tValidPoint = []; // transformed pts;


                    for (const pt of inner) {
                        if (clip(pt) === 1 || true) {
                            tValidPoint.push(tPoint(pt))
                        }
                    }

                    if (tValidPoint.length > 1) {
                        raw_data.push(tValidPoint); // add all
                    }
                });
            });

            // SR Abort!
            callback(null, raw_data);
            done_func(raw_data);
        });
    }).defer(function (callback) {
        d3.json(path + "/" + cfg.stars.data, function (error, json) {
            if (error) callback(error);

            var cons = getData(json, cfg.transform);
            cons = cons.features.filter(function (d) {
                return d.properties.mag <= cfg.stars.designationLimit * adapt && clip(d.geometry.coordinates) === 1;
            }).map(v => {
                return tPoint(v.geometry.coordinates);
            });
            callback(null, cons);
        });
    }).await(function(error, lines, stars) {
        console.log(error);
        console.log("done");
        console.log(lines);
        console.log(stars);
    });

    // Helper functions

    function clip(coords) {
        return proj.clip && d3.geo.distance(center, coords) > halfπ ? 0 : 1;
    }

    function filename(what, sub, ext) {
        var cult = (has(formats[what], culture)) ? "." + culture : "";
        ext = ext ? "." + ext : ".json";
        sub = sub ? "." + sub : "";
        return "/" + what + sub + cult + ext;
    }
}

Celestial.dump_raw = function (callback) {
    dump(callback);
};
