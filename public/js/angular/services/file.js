'use strict';

angular.module('floud.services').
    service('File', ['Auth', '$resource', function(Auth, $resource) {
        var filesApi = '/api/v1.0/files';
        var filesRes = $resource(filesApi, {}, {
            tree: {
                isArray: true,
                url: filesApi + '/tree',
                method: 'GET',
                transformRequest:  function(data, headers) {
                    headers()['Authorization'] = Auth.getToken();
                    return JSON.stringify(data);
                }
            },
            upload: {
                method: 'POST',
                transformRequest:  function(data, headers) {
                    headers()['Authorization'] = Auth.getToken();
                    return JSON.stringify(data);
                }
            },
            delete: {
                url: filesApi + '/file',
                method: 'DELETE',
                transformRequest:  function(data, headers) {
                    headers()['Authorization'] = Auth.getToken();
                    return JSON.stringify(data);
                }
            },
            restore: {
                url: filesApi + '/restore',
                method: 'POST',
                transformRequest:  function(data, headers) {
                    headers()['Authorization'] = Auth.getToken();
                    return JSON.stringify(data);
                }
            }
        });

        filesRes.get = function(file, success, error) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', filesApi + '/file?path='+ file.path, true);
            xhr.responseType = 'arraybuffer';
            xhr.setRequestHeader('Authorization', Auth.getToken());
            xhr.onreadystatechange = function(e) {
                if (xhr.readyState == 4 && xhr.status == 200) {
                    var blob = new Blob([this.response]);
                    saveAs(blob, file.name);
                    success();
                } else if (xhr.readyState == 4 && xhr.status !== 200) {
                    error(e);
                }
            };

            xhr.send();
        };

        return filesRes;
    }]);