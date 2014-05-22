'use strict';

angular
    .module('floud.controllers')
    .controller('FileCtrl', ['$location', 'Auth', '$scope', 'File', '$fileUploader', function($location, Auth, $scope, File, $fileUploader) {
        $scope.currentPath = '/';
        $scope.currentFolderContent = null;
        $scope.files = null;

        File.tree({}, function(filesTree) {
            console.log(filesTree);
            $scope.files = filesTree;
        });

        var uploader = $scope.uploader = $fileUploader.create({
            scope: $scope,
            url: '/api/v1.0/files',
            headers: {
                'Authorization': Auth.getToken()
            },
            formData: {},
            autoUpload: false
        });

        uploader.bind('afteraddingfile', function(evt, item) {
            var reader = new FileReader();
            reader.readAsArrayBuffer(item.file);

            reader.onload = function() {
                var buffer = this.result;
                var view = new Uint8Array(buffer);
                var wordArray = CryptoJS.lib.WordArray.create(view);
                var sum = CryptoJS.SHA1(wordArray).toString(CryptoJS.enc.Hex);

                var formData = {
                    hash: sum,
                    path: $scope.filePath,
                    size: item.file.size
                };
                item.formData = [formData];

                item.upload();
            };
        });

        uploader.bind('complete', function() {
            console.log('done');
        });

        $scope.getFolderContent = function() {

        }
    }]);