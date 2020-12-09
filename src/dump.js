/* global d3, Celestial, projections, poles, getData, getPlanet, getMwbackground, getAngles, getWidth, getGridValues, has, isArray, halfπ, symbols, starnames, dsonames, bvcolor, settings, formats, transformDeg, euler, Round */

function dump(done_func) {
    m = Celestial.metrics();
    cfg = settings.set();
    path = cfg.datapath;
    proj = projections[cfg.projection];
    rotation = getAngles(cfg.center);
    center = [-rotation[0], -rotation[1]];
    scale0 = proj.scale * m.width / 1024;
    projection = Celestial.projection(cfg.projection).rotate(rotation).translate([m.width / 2, m.height / 2]).scale([m.scale]);
    adapt = cfg.adaptable ? Math.sqrt(m.scale / scale0) : 1;
    culture = (cfg.culture !== "" && cfg.culture !== "iau") ? cfg.culture : "";

    if (proj.clip) {
        projection.clipAngle(90);
    }

    var q = d3.queue(2);

    var raw_data = [];

    //Constellation lines
    q.defer(function (callback) {
        d3.json(path + filename("constellations", "lines"), function (error, json) {
            var conl = getData(json, cfg.transform);

            var scale = .001;

            const fx = (v) => {
                pts = projection(v);
                return `X${pts[0] - 1000} Y${pts[1] - 1000}`
            };

            const tPoint = (v) => {
                pts = projection(v);
                return [pts[0] * scale - 1000 * scale, pts[1] * scale - 1000 * scale]
            };

            const checkPtValid = (v) => {
                return clip(v) === 1;
            };

            conl.features.forEach(v => {
                v.geometry.coordinates.forEach(inner => {
                    let tValidPoint = []; // transformed pts;

                    for (const pt of inner) {
                        if (checkPtValid(pt)) {
                            tValidPoint.push(tPoint(pt))
                        }
                    }

                    if (tValidPoint.length > 1) {
                        raw_data.push(tValidPoint); // add all
                    }
                });
            });

            // SR Abort!
            callback(raw_data);
            done_func(raw_data);
        });
    });


    // Get stars
    q.defer(function (callback) {
        d3.json(path + "/" + cfg.stars.data, function (error, json) {
            if (error) callback(error);

            var cons = getData(json, cfg.transform);
            cons = cons.features.filter(function (d) {
                return d.properties.mag <= cfg.stars.designationLimit * adapt && clip(d.geometry.coordinates) === 1;
            });
            callback(cons);
        });
    });

    q.await(function(cords, lines, stars) {
        console.log("Done");
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
