import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

@Injectable()
export class ConstantsService {
  API_BASE_URL: string = environment.apiBaseUrl;
  AWS_S3_BASE_URL: string = 'https://jackpot-music-game.s3.amazonaws.com';
  ONESIGNAL_APP_ID: string = '';
  GOOGLE_PROJECT_NUMBER: string = '';
  GOOGLE_ANALYTICS_TRACKING_ID: string = '';

  /**
   * Admin constants
   */
  FILE_UPLOAD_DEFAULT_ALLOWED_MIME_TYPES: string[] = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'text/plain', 'text/csv', 'audio/mpeg', 'video/mp4', 'audio/ogg', 'audio/mp3',
  ];
  FILE_UPLOAD_DEFAULT_MAX_FILE_SIZE: number = 10000000;
  IMAGE_MIME_TYPES: string[] = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  SIDEBAR_ITEMS: object[] = [
    {
      title: 'Users',
      icon: 'users',
      class: 'User',
    },
    {
      title: 'Games',
      icon: '',
      class: 'Game',
    },
    {
      title: 'Songs',
      icon: '',
      class: 'Song',
    },
    {
      title: 'Settings',
      icon: '',
      class: 'Settings',
    },
  ];
  DEFAULT_SCHEMA_OVERWRITES: object = {
    User: {
      avatar: {
        instanceOverride: 'Image',
        allowedMimeType: ['image/jpeg', 'image/jpg', 'image/png'],
      },
      password: {
        instanceOverride: 'Remove',
      },
    },
    Song: {
      artist: {
        displayName: 'artist',
      },
      title: {
        displayName: 'title',
      },
      categories: {
        displayName: 'categories',
      },
      file: {
        instanceOverride: 'File',
        displayName: 'file',
        allowedMimeType: ['audio/ogg', 'audio/mp3'],
      },
    },
  };

  constructor() {
    // Only add dynamic constants here
    // e.g. this.ROOT_URL = window.location.origin;
  }
}
