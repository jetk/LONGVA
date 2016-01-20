angular.module('app.services', [])

.service('LoginService', function ($q) {
    return {
        //returns login function that accepts credentials as parameters
        loginUser: function (name, pw, inst) {
            var deferred = $q.defer();
            var promise = deferred.promise;
            
            
            //hardcoded login credentials, can be replaced by server call
            var key_pair = {
                "111111": {
                    pw: "abcdef",
                    inst: 1
                },
                "222222": {
                    pw: "bcdefg",
                    inst: 2
                },
                gamma: {
                    pw: "b",
                    inst: 3
                },
                "123456": {
                    pw: "d",
                    inst: 4
                }
            }
            
            //verifies credentials
            if (key_pair[name].pw == pw && key_pair[name].inst == inst) {
                deferred.resolve('Welcome ' + name + '!');
            } else {
                deferred.reject('Wrong credentials.');
            }
            //success callback
            promise.success = function (fn) {
                promise.then(fn);
                return promise;
            }
            //error callback
            promise.error = function (fn) {
                promise.then(null, fn);
                return promise;
            }
            return promise;
        }
    }
})

.service('SCB', [function () {
    
    //Session Control Boolean: determines if still recording or replaying
    var SCB = true;
    //getter and setter methods
    return {
        getSCB: function () {
            return SCB;
        },
        setSCB: function (value) {
            SCB = value;
        }
    };

}])

.factory('$localstorage', ['$window', function ($window) {
    //localStorage utility wrapper. Setters and getters for various data types
    return {
        set: function (key, value) {
            $window.localStorage[key] = value;
        },
        get: function (key, defaultValue) {
            return $window.localStorage[key] || defaultValue;
        },
        setArray: function (key, value) {
            $window.localStorage[key] = value;
        },
        getArray: function (key, defaultValue) {
            var array_as_string = $window.localStorage[key]
            var array = array_as_string.split(",")
            return array || defaultValue;
        },
        setObject: function (key, value) {
            $window.localStorage[key] = JSON.stringify(value);
        },
        getObject: function (key) {
            return JSON.parse($window.localStorage[key] || '{}');
        },
        
        //Set session ID (Called at the start of a recording sesssion to uniquely timestamp and ID recordings)
        setsid: function () {

            //checks the number of sessions and sets to one if running for the first time, increments otherwise
            var temp = $window.localStorage['session_number'];
            if (temp > 0)
                $window.localStorage['session_number'] = ++temp
            else
                $window.localStorage['session_number'] = 1

            //generates an iso8601 timestamp for the SESSION, not the recording

            var today = new Date();
            var hours = today.getHours();
            var mins = today.getMinutes();
            var dd = today.getDate();
            var mm = today.getMonth() + 1;
            var yyyy = today.getFullYear();
            if (dd < 10)
                dd = '0' + dd
            if (mm < 10)
                mm = '0' + mm

            var isotime = yyyy + "-" + mm + "-" + dd + "-" + hours + "h" + mins + "m"
            var javatime = yyyy + "-" + mm + "-" + dd + " " + hours + ":" + mins + ":00"

            var ampm
            if (hours>=12)
                {
                    ampm = "PM"
                }
            else
                {
                    ampm = "AM"
                }
            
            $window.localStorage['ampm'] = ampm
            $window.localStorage['timestamp'] = isotime
            $window.localStorage['javatimestamp'] = javatime
        },
        
        //Session ID getter: retrieves various elements of session ID, concatenates and returns them
        getsid: function () {
            var uid = $window.localStorage['uid'];
            var session_number = $window.localStorage['session_number']
            var ampm = $window.localStorage['ampm']
            if (session_number < 10) {
                session_number = "000" + session_number
            } else if (session_number < 100 && session_number > 10) {
                session_number = "00" + session_number
            } else if (session_number < 1000 && session_number > 100) {
                session_number = "0" + session_number
            }
            var timestamp = $window.localStorage['timestamp']

            return uid + "_" + session_number + "_" + timestamp + "_" + ampm
        }
    }
}])

.factory('multibatch_uploader', ['$cordovaFile', '$localstorage', '$cordovaFileTransfer', '$q', '$http', function ($cordovaFile, $localstorage, $cordovaFileTransfer, $q, $http) {

    return {
        //main function to be called. jsfn is json filenames to be uploaded
        doit: function (jsfn) {
            //pre-set how many times to loop
            var loops = jsfn.length

            console.log("current metadata files" + JSON.stringify(jsfn))
            
            //recursive function that lets us loop asynchronously through the metadata filenames
            var asyncLoop = function (o) {
                var i = 0,
                    length = o.length;

                var loop = function () {
                    i++;
                    if (i == length) {
                        o.callback();
                        return;
                    }
                    o.functionToLoop(loop, i);
                }
                loop(); //init
            }

            //calling the asyncloop, looping the actual function i times
            asyncLoop({
                length: loops,
                functionToLoop: function (loop, i) {
                    console.log('Iteration ' + i);
                    recursive_upload(i);
                    loop();
                },
                callback: function () {
                    var metadata_filenames = new Array;
                    console.log('All uploads initiated!');
                }
            });


            //main functionality
            function recursive_upload(i) {
                
                //Gets full path of metadata file and uses HTTP get to populate data object
                var filepath = cordova.file.externalDataDirectory + jsfn[i]
                $http.get(filepath).success(function (data) {
                    
                    //deletes JSON file
                    $cordovaFile.removeFile(cordova.file.externalDataDirectory, jsfn[i])
                    
                    //upon succes, extracts the recording names
                    var recording_names = data.rec_names
                    console.log("got recording names: " + JSON.stringify(recording_names))
                    
                    
                    //Calls the inner upload function and stores the $q.all() group promise returned
                    var triggered_upload_promises = promised_upload(recording_names)
                    
                    
                    //Initiates and returns promise of upload
                    function promised_upload(recording_name_array) {

                        console.log("now tackling" + JSON.stringify(recording_name_array))
                        
                        //Prepares array of promises to push to $q.all
                        var upload_promises = []

                        //Loops through array itself and configures / triggers uploads
                        for (var prop in recording_name_array) {
                            //establishes correct file to upload and initialises parameters
                            var filename = cordova.file.externalDataDirectory + recording_name_array[prop]
                            var uploadurl = "http://longva.cs.ucl.ac.uk:9000/saveSoundFile?path=//home//figarski//Documents//SoundFiles//" + recording_name_array[prop]
                            console.log("will attempt to upload: " + filename)
                            var options = {
                                fileName: recording_name_array[prop],
                                chunkedMode: true,
                                mimeType: undefined,
                                headers: {
                                    'Content-Type': 'audio/x-wav'
                                }
                            };
                            
                            //stores returned promise of file transfer
                            var promise = $cordovaFileTransfer.upload(uploadurl, filename, options);
                            upload_promises.push(promise);
                        }
                        //returns all promises as single object
                        return $q.all(upload_promises)
                    }

                    // when all uploads are completed for current batch
                    triggered_upload_promises.then(function (values) {
                        console.log('done uploading')
                        //calls delete files function for this batch
                        delete_files();
                        //posts metadata for this batch
                        post_to_database();
                    })
                    
                    //loops through all files, deletes them (don't care when complete)
                    function delete_files() {
                        for (var index in recording_names) {
                            console.log("attempting to delete " + recording_names[index])
                            $cordovaFile.removeFile(cordova.file.externalDataDirectory, recording_names[index])
                        }
                    }
                    
                    //makes the 3 required uploads to database
                    function post_to_database() {
                        console.log("posting metatdata")
                        //initialises promise array and URLs for postreqs
                        var post_promises = []
                        var baseURL = "http://longva.cs.ucl.ac.uk:9000"
                        var url1 = baseURL + "/login"
                        var url2 = baseURL + "/storeRecMdata"
                        var url3 = baseURL + "/storeSessionMdata"
                        
                        //pushes the three promises to aray
                        post_promises.push($http.post(url1, data))
                        post_promises.push($http.post(url2, data))
                        post_promises.push($http.post(url3, data))
                        
                        var all_post_promises = $q.all(post_promises)
                        
                        
                        //When done, log
                        all_post_promises.then(function (post_responses) {
                            for (var index in post_responses) {
                                console.log(JSON.stringify(post_responses[index]))
                            }
                        })
                    }

                }).error(function () {
                    alert("error reading")
                });
            }
        }
    }
}])
;