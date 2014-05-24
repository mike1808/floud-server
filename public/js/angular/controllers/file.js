'use strict';

angular
    .module('floud.controllers')
    .controller('FileCtrl', function(File, hotkeys, growl, $scope, Auth, $upload, $timeout, $location) {
        var self = this;
        var icons = {
            directory: 'fa-folder',
            image: 'fa-file-image-o',
            archive: 'fa-file-archive-o',
            file: 'fa-file-o',
            excel: 'fa-file-excel-o',
            sound: 'fa-file-sound-o',
            word: 'fa-file-word-o',
            text: 'fa-file-text',
            video: 'fa-file-video-o',
            code: 'fa-file-code-o',
            ppt: 'fa-file-powerpoint-o'
        };

        var fileTypes = {
            text: ['txt'],
            image: ['jpg', 'jpeg', 'png', 'gif', 'ttf', 'bmp'],
            archive: ['tar', 'tar.gz', 'zip', 'rar'],
            excel: ['xlsx', 'lsx'],
            sound: ['mp3', 'wav', 'ogg', 'wma', 'amr', 'flac', 'aac'],
            word: ['doc', 'docx'],
            video: ['mpg', 'mpeg', 'avi', '3gp', 'flv'],
            code: ['js', 'cpp', 'c', 'css', 'jade', 'html', 'class'],
            ppt: ['ppt', 'pptx']
        };

        File.tree({}, function(files) {
            self.init(files);
        });

        this.showDeleted = false;

        this.init = function(files) {
            this.files = files;
            this.currentDir = files[0];

            if ($location.hash()) {
                changeDirTo($location.hash());
            }
        };

        this.processFile = function(file) {
            if (isDirectory(file)) {
                file.parent = this.currentDir;
                this.currentDir = file;
                var hash = $location.hash();
                $location.hash(joinPath(hash, this.currentDir.name));

            } else {
                File.get(file, function() {}, function(err) {
                    growl.addErrorMessage('Ooops! Something happened when I tried to download your file.');
                });
            }
        };

        this.toggleDeletedFiles = function() {
            this.showDeleted = !this.showDeleted;
        };

        this.restoreFile = function(event, file, index) {
            event.stopPropagation();

            File.restore({ path: file.path }, function() {
               self.currentDir.children[index].deleted = false;
            }, function() {
                growl.addErrorMessage('Sorry, we could not restore this file :(');
            });
        };

        this.deleteFile = function(event, file, index) {
            event.stopPropagation();

            File.delete({ path: file.path }, function() {
                self.currentDir.children[index].deleted = true;
            }, function() {
                growl.addErrorMessage('Sorry, we could not delete this file :(');
            });
        };

        this.mkDir = function() {
            this.currentDir.children.unshift({
                children: [],
                name: self.dirName,
                parent: self.currentDir
            });

            this.dirName = '';
        };

        this.getIcon = function(file) {
            if (isDirectory(file)) {
                return icons.directory;
            } else {
                file.type = getType(file);
                return icons[file.type];
            }
        };

        this.goBack = function() {
            if (hasParent(self.currentDir)) {
                var hash = $location.hash();
                var idx = hash.indexOf(self.currentDir.name);
                $location.hash(hash.substring(0, idx - 1));
                self.currentDir = self.currentDir.parent;
            }
        };

        this.isDeleted = function(file) {
            var isDeleted = false;

            if (isFile(file)) {
                isDeleted = file.deleted;
            } else {
                for (var i = 0; i < file.children.length; i++) {
                    var child = file.children[i];
                    isDeleted = self.isDeleted(child);
                    if (isDeleted) return true;
                }
            }

            return isDeleted;
        };

        this.onFileSelect = function($files) {
            self.uploading = true;
            self.progress = 0;
            for (var i = 0; i < $files.length; i++) {
                var file = $files[i];

                var reader = new FileReader();
                reader.readAsArrayBuffer(file);

                reader.onload = function() {
                    var buffer = this.result;
                    var view = new Uint8Array(buffer);
                    var wordArray = CryptoJS.lib.WordArray.create(view);
                    var sum = CryptoJS.SHA1(wordArray).toString(CryptoJS.enc.Hex);

                    var formData = {
                        hash: sum,
                        path: joinPath(getPathTo(self.currentDir), file.name),
                        size: file.size
                    };

                    $upload.upload({
                        method: 'POST',
                        url: '/api/v1.0/files',
                        headers: {
                            'Authorization': Auth.getToken()
                        },
                        file: file,
                        data: formData
                    }).then(function(response) {
                        var file = response.data;
                        file.name = file.path.substr(file.path.lastIndexOf('/') + 1);
                        self.currentDir.children.push(file);
                    }, function() {
                        growl.addErrorMessage('Something happened during the upload!');
                        $timeout(function() {
                            self.uploading = false;
                            self.progress = 0;
                        }, 2000);
                    }, function(evt) {
                        self.progress = parseInt(100.0 * evt.loaded / evt.total) + '%';
                    });
                };
            }
        };

        hotkeys.add({
            combo: 'backspace',
            description: 'go back',
            callback: function(event) {
                event.preventDefault();
                self.goBack();
            }
        });

        function getType(file) {
            var ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.') + 1);
            for (var type in fileTypes) {
                if (fileTypes[type].indexOf(ext) != -1) {
                    return type;
                }
            }

            return 'file';
        }

        function isFile(file) {
            return !('children' in file);
        }

        function isDirectory(file) {
            return ('children' in file);
        }

        function hasParent(file) {
            return ('parent' in file);
        }

        function isRoot(file) {
            return isDirectory(file) && !hasParent(file);
        }

        function joinPath(path1, path2) {
            var path = '/' + path1 + '/' + path2;
            path = path.replace(/\/{2,}/g, '/');
            return path;
        }

        function getPathTo(file) {
            if (!file) return '/';

            return joinPath(getPathTo(file.parent), file.name);
        }

        function changeDirTo(path) {
            var tokens = path.split('/');

            var currentDir = self.currentDir;
            for(var level = 0; level < tokens.length; level++) {
                for (var i = 0; i < currentDir.children.length; i++) {
                    var file = currentDir.children[i];
                    if (isDirectory(file)) {
                        if (file.name === tokens[level]) {
                            file.parent = currentDir;
                            currentDir = file;
                            break;
                        }
                    }
                }
            }

            self.currentDir = currentDir;
        }
    });