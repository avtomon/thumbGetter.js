"use strict";

import {Utils} from "../../../good-funcs.js/dist/js/GoodFuncs.js";

export namespace ImageGenerator {

    /**
     * Объект размеров изображения
     */
    type Dimensions = { height : number; width : number };

    /**
     * Сигнатура обработчика получения превью PDF-файла
     */
    type PDFToBlobCallback = (result : File | null, canvas : HTMLCanvasElement, iframe : HTMLIFrameElement, file : File) => void;

    /**
     * Сигнатура обработчика получения превью видео
     */
    type VideoToBlobCallback = (result : File | null, canvas : HTMLCanvasElement, video : HTMLVideoElement, file : File) => void;

    /**
     * Сигнатура обработчика получения превью изображения
     */
    type ImageToBlobCallback = (result : File | null) => void;

    /**
     * Интерфейс настроек изображения
     */
    interface IThumbsSettings {

        /**
         * Максимальная высота
         */
        maxHeight? : number;

        /**
         * Максимальная ширина
         */
        maxWidth? : number;

        /**
         * Качество выходного изображения
         */
        imageQuality? : number;
    }

    /**
     * Получение превью из картинки, видео или PDF
     */
    export class ThumbsGetter {

        /**
         * Вычисление размеров изображения
         *
         * @param {IThumbsSettings} settings - настройки
         *
         * @returns {Dimensions}
         */
        public static getDimensions(
            this : HTMLImageElement | HTMLVideoElement,
            settings : IThumbsSettings
        ) : { height : number, width : number } {

            let elementHeight : number = this.height || this['videoHeight'],
                elementWidth : number = this.width || this['videoWidth'];

            if (!settings.maxHeight) {
                settings.maxHeight = elementHeight;
            }

            if (!settings.maxWidth) {
                settings.maxWidth = elementWidth;
            }

            let newHeight : number,
                newWidth : number;

            if (this.height > this.width) {
                newHeight = settings.maxHeight;
                newWidth = elementWidth * newHeight / elementHeight;
            } else {
                newWidth = settings.maxWidth;
                newHeight = elementHeight * newWidth / elementWidth;
            }

            return {
                height: newHeight,
                width: newWidth
            }
        }

        /**
         * Генерация имени полученного изображения
         *
         * @param {string} filename
         *
         * @returns {string}
         */
        public static getImageName(filename : string) : string {
            let posterArray : string[] = filename.split('.');
            posterArray.splice(-1, 1);

            return posterArray.join('.') + '.jpg';
        }

        /**
         * Формирование изображения из загруженной картинки
         *
         * @param {File} file - загруженный файл
         * @param {HTMLImageElement} image - в какой элемент подгружаем изображение
         * @param {ImageToBlobCallback} toBlobCallback - обработчик генерации блоба из загруженного файла
         * @param {IThumbsSettings} settings - настройки
         *
         * @returns {HTMLCanvasElement | null}
         */
        public static handleImageSelect(
            file : File,
            image : HTMLImageElement,
            toBlobCallback : ImageToBlobCallback,
            settings : IThumbsSettings = {
                maxHeight: 100,
                maxWidth: 100,
                imageQuality: 0.9
            }) : HTMLCanvasElement | null {

            let canvas : HTMLCanvasElement = document.createElement('canvas'),
                ctx : CanvasRenderingContext2D = canvas.getContext('2d') as CanvasRenderingContext2D,
                URL = window.URL || window['webkitURL'],

                imgLoadHandler = function () {

                    let {
                        width: newWidth,
                        height: newHeight
                    } = ThumbsGetter.getDimensions.call(this, settings);

                    canvas.width = newWidth;
                    canvas.height = newHeight;
                    canvas.style.display = 'block';

                    ctx.drawImage(this, 0, 0, newWidth, newHeight);

                    canvas.toBlob(function (blob : Blob | null) {
                        toBlobCallback(blob ? new File([blob], ThumbsGetter.getImageName(file.name)) : null);
                    }, 'image/jpeg', settings.imageQuality);

                    URL.revokeObjectURL(this.src);
                };

            if (!URL) {
                return null;
            }

            image.onload = imgLoadHandler;
            image.src = URL.createObjectURL(file);

            return canvas;
        }

        /**
         * Формирование видео из загруженного файла
         *
         * @param {File} file - загруженный файл
         * @param {HTMLVideoElement} video - в какой элемент подгружаем видео
         * @param {VideoToBlobCallback} toBlobCallback - обработчик генерации блоба из загруженного файла
         * @param {IThumbsSettings} settings - настройки
         *
         * @returns {HTMLCanvasElement | null}
         */
        public static handleVideoSelect(
            file : File,
            video : HTMLVideoElement,
            toBlobCallback : VideoToBlobCallback,
            settings : IThumbsSettings = {
                imageQuality: 0.9
            }) : HTMLCanvasElement | null {
            let canvas = document.createElement('canvas'),
                ctx : CanvasRenderingContext2D = canvas.getContext('2d') as CanvasRenderingContext2D,
                URL = window.URL || window['webkitURL'],

                videoLoadHandler = function () : void {
                    let {
                        width: newWidth,
                        height: newHeight
                    } = ThumbsGetter.getDimensions.call(this, settings);

                    canvas.width = newWidth;
                    canvas.height = newHeight;
                    ctx.drawImage(this, 0, 0, newWidth, newHeight);

                    canvas.toBlob(function (blob : Blob | null) : void {

                        video.currentTime = 0;
                        toBlobCallback(
                            blob ? new File([blob], ThumbsGetter.getImageName(file.name)) : null,
                            canvas,
                            video,
                            file
                        );
                    }, 'image/jpeg', settings.imageQuality);
                };

            if (!URL) {
                return null;
            }

            video.src = URL.createObjectURL(file);
            video.currentTime = 5;
            video.onloadeddata = videoLoadHandler;


            return canvas;
        }

        /**
         * Формирование PDF из загруженного файла
         *
         * @param {File} file - загруженный файл
         * @param {HTMLIFrameElement} iframe - в какой элемент подгружаем PDF
         * @param {PDFToBlobCallback} toBlobCallback - обработчик генерации блоба из загруженного файла
         * @param {IThumbsSettings} settings - настройки
         *
         * @returns {HTMLCanvasElement | null}
         */
        public static async handlePdfSelect(
            file : File,
            iframe : HTMLIFrameElement,
            toBlobCallback : PDFToBlobCallback,
            settings : IThumbsSettings = {
                imageQuality: 0.9
            }) : Promise<HTMLCanvasElement | null> {

            let canvas = document.createElement('canvas'),
                URL = window.URL || window['webkitURL'];

            if (!URL) {
                return null;
            }

            let iframeUrl = URL.createObjectURL(file);
            iframe.src = iframeUrl;

            await Promise.all(Utils.GoodFuncs.getScripts(['/vendor/bower-asset/pdfjs-dist/build/pdf.js']));

            setTimeout(function () {
                pdfjsLib.getDocument(iframeUrl).promise
                    .then(function (pdf) {
                        pdf.getPage(1).then(function (page) {
                            let viewport = page.getViewport({scale: 1});

                            let {
                                width: newWidth,
                                height: newHeight
                            } = ThumbsGetter.getDimensions.call(viewport, settings);

                            canvas.width = newWidth;
                            canvas.height = newHeight;

                            let renderContext = {
                                canvasContext: canvas.getContext('2d'),
                                viewport: viewport
                            };

                            page.render(renderContext).promise.then(function () {
                                canvas.toBlob(function (blob : Blob | null) {
                                    toBlobCallback(
                                        blob ? new File([blob], ThumbsGetter.getImageName(file.name)) : null,
                                        canvas,
                                        iframe,
                                        file
                                    );
                                }, 'image/jpeg', settings.imageQuality);
                            });
                        });
                    });
            }, 200);

            return canvas;
        }
    }
}
