(function() {
    var app = angular.module('ckan-importer-service', []);

    app.factory('CkanImporterService', CkanImporterService);

    CkanImporterService.$inject = ['$http', '$cookieStore', '$rootScope', '$timeout', 'rest', 'Upload'];

    function CkanImporterService($http, $cookieStore, $rootScope, $timeout, $scope, CkanImporterService, rest, Upload) {
        var service = {};
        service.Import = Import;
        service.getResults = getResults;

        var client = null;
        var restClient = rest;
        var uploadClient = Upload;

        var global = {
            categories: [],
            tags: [],
            datasets: [],
            tagsLimit: 0,
            datasetsLimit: 0,
            datasetNames: []
        };
        var defaults = {};
        var res_models = [];

        var results = {
            categories: {
                total: 0,
                count: 0,
                log: ""
            },
            tags: {
                total: 0,
                count: 0,
                log: ""
            },
            datasets: {
                total: 0,
                count: 0,
                log: ""
            },
            resources: {
                count: 0,
                log: ""
            }
        };

        return service;

        function getResults() {
            return results;
        }

        function Import(rest, Upload, def, importCallback) {
            restClient = rest;
            uploadClient = Upload;
            defaults = def;
            client = new CKAN.Client(defaults.url);

            // These two defaults could be decreased if you experience out of memory issues 
            // or could be increased if your app needs to show many images on the page.
            // Each image in ngf-src, ngf-background or ngf-thumbnail is stored and referenced as a blob url
            // and will only be released if the max value of the followings is reached.
            uploadClient.defaults.blobUrlsMaxMemory = 52428800; // 26214400 default: 268435456 max total size of files stored in blob urls.
            uploadClient.defaults.blobUrlsMaxQueueSize = 5; // 20 default: 200 max number of blob urls stored by this application.

            async.waterfall([
                function(callback) {
                    if (defaults.modules.categories) {
                        console.log("* Categories: getting names..");
                        getCategoryNames(callback);
                    } else {
                        callback(null, null);
                    }
                },
                function(categoryNames, callback) {
                    if (defaults.modules.categories) {
                        console.log("* Categories: importing..");
                        importCategories(categoryNames, callback);
                    } else {
                        callback(null);
                    }
                },
                function(callback) {
                    if (defaults.modules.tags) {
                        console.log("* Tags: getting names..");
                        getTagNames(callback);
                    } else {
                        callback(null, null);
                    }
                },
                function(tagNames, callback) {
                    if (defaults.modules.tags) {
                        console.log("* Tags: importing..");
                        importTags(tagNames, callback);
                    } else {
                        callback(null);
                    }
                },
                function(callback) {
                    if (defaults.modules.categories && defaults.modules.tags && defaults.modules.datasets) {
                        console.log("* Datasets: getting tags..");
                        result = restClient().get({
                            type: "tags",
                            params: "limit=" + global.tagsLimit * 2 + "&orderBy=name&sort=DESC"
                        }, function() {
                            global.tags = result.data;
                            callback();
                        });
                    } else {
                        callback(null);
                    }
                },
                function(callback) {
                    if (defaults.modules.categories && defaults.modules.tags && defaults.modules.datasets) {
                        console.log("* Datasets: getting categories..");
                        result = restClient().get({
                            type: "categories",
                            params: "orderBy=name&sort=DESC"
                        }, function() {
                            global.categories = result.data;
                            callback();
                        });
                    } else {
                        callback(null);
                    }
                },
                function(callback) {
                    if (defaults.modules.categories && defaults.modules.tags && defaults.modules.datasets) {
                        console.log("* Datasets: getting names..");
                        getDatasetNames(callback);
                    } else {
                        callback(null);
                    }

                },
                function(callback) {
                    if (defaults.modules.categories && defaults.modules.tags && defaults.modules.datasets) {
                        console.log("* Datasets: importing..");
                        importDatasets(callback);
                    } else {
                        callback(null);
                    }
                },
                function(callback) {
                    if (defaults.modules.categories && defaults.modules.tags && defaults.modules.datasets && defaults.modules.resources) {
                        console.log("* Resources: getting datasets..");
                        result = restClient().get({
                            type: "datasets",
                            params: "limit=" + global.datasetsLimit * 2 + "&orderBy=name&sort=DESC"
                        }, function() {
                            global.datasets = result.data;
                            callback();
                        });
                    } else {
                        callback(null);
                    }
                },
                function(callback) {
                    if (defaults.modules.categories && defaults.modules.tags && defaults.modules.datasets && defaults.modules.resources) {
                        console.log("* Resources: importing..");
                        importResources(callback);
                    } else {
                        callback(null);
                    }
                },
                function(callback) {
                    if (defaults.modules.categories && defaults.modules.tags && defaults.modules.datasets && defaults.modules.resources) {
                        console.log("* Resources: uploading..");
                        console.log(res_models, res_models.length);
                        async.eachSeries(res_models, function(resource, callback2) {
                            uploadModel(resource, callback2, results.resources);
                        }, function(err) {
                            callback(null);
                        });
                    } else {
                        callback(null);
                    }
                }
            ], function(err) {
                console.log('*** IMPORT FINISHED ***');
                importCallback();
            });
        }

        function getCategoryNames(callback) {
            // http://data.buenosaires.gob.ar/api/3/action/group_list?q=
            client.action('group_list', {}, function(err, result) {
                if (err) {
                    // console.log("ERROR getCategoryNames: ", err);
                } else {
                    results.categories.total = result.result.length;
                    callback(null, result.result);
                }
            });
        }

        function getTagNames(callback) {
            // http://data.buenosaires.gob.ar/api/3/action/tag_list?q=
            client.action('tag_list', {}, function(err, result) {
                if (err) {
                    // console.log("ERROR getTagNames: ", err);
                } else {
                    results.tags.total = result.result.length;
                    global.tagsLimit = result.result.length;
                    callback(null, result.result);
                }
            });
        }

        function getDatasetNames(callback) {
            // http://data.buenosaires.gob.ar/api/3/action/package_list?q=
            client.action('package_list', {}, function(err, result) {
                if (err) {
                    // console.log("ERROR getDatasetNames: ", err);
                } else {
                    results.datasets.total = result.result.length;
                    global.datasetNames = result.result;
                    global.datasetsLimit = result.result.length;
                    callback(null);
                }
            });
        }

        function importCategories(categoryNames, callbackFunc) {
            // http://data.buenosaires.gob.ar/api/3/action/group_show?id=categoryName
            async.eachSeries(categoryNames, function(categoryName, callback) {
                client.action('group_show', { id: categoryName }, function(err, result) {
                    if (!err) {
                        var category = result.result;
                        var model = {
                            modelName: "Category",
                            type: "categories",
                            name: category.title.trim(),
                            description: category.description.trim(),
                            active: category.state == 'active' ? true : false
                        };

                        importModel(model, callback, results.categories);
                    } else {
                        // console.log("ERROR CATEGORY: ", err);
                        callback(err);
                    }
                });
            }, function(err) {
                if (err) {
                    // console.log("Error importando algunas categorías");
                }
                callbackFunc(null);
            });
        }

        function importTags(tagNames, callbackFunc) {
            // http://data.buenosaires.gob.ar/api/3/action/tag_show?id=tagName
            async.eachSeries(tagNames, function(tagName, callback) {
                client.action('tag_show', { id: tagName }, function(err, result) {
                    if (!err) {
                        var tag = result.result;
                        var model = {
                            modelName: "Tag",
                            type: "tags",
                            name: tag.name.trim()
                        };

                        importModel(model, callback, results.tags);
                    } else {
                        // console.log("ERROR TAG: ", err);
                        callback(err);
                    }
                });
            }, function(err) {
                // if (err) console.log("Error importando algunos tags");
                callbackFunc(null);
            });
        }

        function importDatasets(callbackFunc) {
            // http://data.buenosaires.gob.ar/api/3/action/package_show?id=datasetName
            async.eachSeries(global.datasetNames, function(datasetName, callback) {
                client.action('package_show', { id: datasetName }, function(err, result) {
                    if (!err) {
                        var dataset = result.result;

                        var datasetCategories = dataset.groups;
                        var categoryIds = [];
                        datasetCategories.forEach(function(datasetCategory) {
                            var categoryId = global.categories.filter(function(cat) {
                                return cat.name.trim() === datasetCategory.title.trim();
                            }).map(function(cat) {
                                return cat.id;
                            });
                            categoryIds.push(categoryId);
                        });
                        categoryIds = categoryIds.join(",");

                        var datasetTags = dataset.tags;
                        var tagIds = [];
                        datasetTags.forEach(function(datasetTag) {
                            var tagId = global.tags.filter(function(tag) {
                                return tag.name.trim() === datasetTag.name.trim();
                            }).map(function(tag) {
                                return tag.id;
                            });
                            tagIds.push(tagId);
                        });
                        tagIds = tagIds.join(",");

                        var datasetExtras = dataset.extras;
                        var extras = {};
                        var extrasItems = [];
                        var extraCont = 1;
                        datasetExtras.forEach(function(datasetOpt) {
                            extras[datasetOpt.key] = datasetOpt.value;
                            extrasItems.push({
                                field1: datasetOpt.key,
                                field2: datasetOpt.value,
                                field: ""
                            });
                            extraCont++;
                        });

                        var model = {
                            modelName: "Dataset",
                            type: "datasets",
                            name: dataset.title.trim(),
                            description: dataset.notes.trim(),
                            status: defaults.status.trim(),
                            categories: categoryIds.trim(),
                            owner: defaults.owner.trim(),
                            tags: tagIds.trim(),
                            optionals: extras,
                            items: extrasItems
                        };

                        for (var i = 1; i < extraCont; i++) {
                            model["optional" + i] = "";
                        }

                        importModel(model, callback, results.datasets);
                    } else {
                        // console.log("ERROR DATASET: ", err);
                        callback(err);
                    }
                });
            }, function(err) {
                // if (err) console.log("Error importando algunos datasets");
                callbackFunc(null);
            });
        }

        function importResources(callbackFunc) {
            // http://data.buenosaires.gob.ar/api/3/action/package_show?id=datasetName
            async.eachLimit(global.datasetNames, 5, function(datasetName, outerCallback) {

                // console.log('=== Processing dataset: ' + datasetName);
                async.waterfall([
                    function(callback) {
                        client.action('package_show', { id: datasetName }, function(err, result) {
                            if (!err) {
                                var dataset = result.result;
                                var datasetResources = dataset.resources;

                                // console.log('--- Getting datasetResources');
                                callback(null, dataset, datasetResources);
                            } else {
                                // console.log("ERROR RESOURCE: ", err);
                                outerCallback(err);
                            }
                        });
                    },
                    function(dataset, datasetResources, callback) {
                        async.eachLimit(datasetResources, 5, function(resource, callback2) {
                            // console.log('--- Processing resource: ' + resource.name);

                            var datasetId = global.datasets.filter(function(dt) {
                                return dt.name.trim() === dataset.title.trim();
                            }).map(function(dt) {
                                return dt.id;
                            });

                            var model = {
                                modelName: "File",
                                type: "files",
                                name: resource.name.trim(),
                                description: resource.description.trim(),
                                type: resource.format.trim(),
                                updateFrequency: defaults.freq.trim(),
                                status: defaults.status.trim(),
                                organization: defaults.organization.trim(),
                                dataset: datasetId[0],
                                owner: defaults.owner.trim()
                            };

                            // console.log('----- Http Getting resource: ' + resource.url);
                            $http.get(resource.url, { timeout: 120000, responseType: "arraybuffer" }).success(function(data) {
                                // console.log('----- SUCCESS Http Getting resource: ' + resource.url);

                                if (data.byteLength > 0 && data.byteLength < 10000000) {
                                    setModelType(model);
                                    setModelName(model);
                                    createFile(data, model);

                                    res_models.push(model);
                                    // console.log("File pushed!", model.name, model.dataset, resource.url, data.byteLength);

                                    data = null;
                                    callback2();

                                } else {
                                    // console.log('----- Http Data NOT UPLOADING');
                                    data = null;
                                    callback2();
                                }
                            }).error(function(error) {
                                // console.log('----- ERROR Http Getting resource: ' + resource.url);
                                callback2();
                            });
                        }, function(err) {
                            // console.log("--- Next resource");
                            callback(err);
                        });
                    }
                ], function(err) {
                    // console.log('=== Finished dataset: ' + datasetName);
                    outerCallback(err);
                });

            }, function(err) {
                // if (err) console.log("Error importando algunos resources");
                // console.log("10) importResources --> TERMINADO");
                callbackFunc(null);
            });
        }

        function importModel(model, callback, results) {
            restClient().save({
                type: model.type
            }, model, function(resp) {
                console.log("Imported OK", resp);
                results.count++;
                callback();
            }, function(error) {
                try {
                    console.log(error.data.data.name[0].message);
                    logMessage(error.data.data.name[0].message, results);
                } catch (cerr) {
                    console.log(error);
                    logMessage(error, results);
                }
                callback();
            });
        }

        function uploadModel(data, callback, results) {
            var param = {
                gatheringDate: null
            };

            uploadClient.upload({
                url: $rootScope.url + "/files",
                data: data,
                params: param
            }).then(function(resp) {
                console.log("Uploaded OK", resp, data.name, data.dataset);
                results.count++;
                // results.total++;
                callback();
            }, function(error) {
                try {
                    console.log(error.data.data.name[0].message);
                    logMessage(error.data.data.name[0].message, results);
                } catch (cerr) {
                    console.log(error, data.name, data.dataset);
                    // logMessage(error, results);
                }
                // results.total++;
                callback();
            });
        }

        function setModelType(model) {
            $scope.fileModel = [];
            $scope.fileModel.name = model.name;
            var type = model.type.toLowerCase();
            if (type == "csv") {
                $scope.fileModel.type = 'text/csv';
            } else if (type == "html") {
                $scope.fileModel.type = 'text/html';
            } else if (type == "ics") {
                $scope.fileModel.type = 'text/calendar';
            } else if (type == "pdf") {
                $scope.fileModel.type = 'application/pdf';
            } else if (type == "rar") {
                $scope.fileModel.type = 'application/x-rar-compressed';
            } else if (type == "shp") {
                $scope.fileModel.type = 'application/octet-stream';
            } else if (type == "xls") {
                $scope.fileModel.type = 'application/vnd.ms-excel'; //'application/xls';
            } else if (type == "xlsx") {
                $scope.fileModel.type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            } else if (type == "xml") {
                $scope.fileModel.type = 'application/xml';
            } else if (type == "zip") {
                $scope.fileModel.type = 'application/zip';
            } else if (type == "json") {
                $scope.fileModel.type = 'application/json';
            }
        }

        function setModelName(model) {
            if (model.name.toLowerCase().indexOf("guía de datos") !== -1) {
                model.name += " (" + model.dataset + ")";
            }
            var type = model.type.toLowerCase();
            if (type != "csv") {
                model.name += " (" + type + ")";
            }
        }

        function createFile(data, model) {
            var type = model.type.toLowerCase();
            var file = new Blob([data], { type: $scope.fileModel.type });
            file.name = model.name + "." + type;
            model.uploadFile = file;
        }

        function logMessage(msg, logger) {
            logger.log += msg + "\n";
        }
    }

})();