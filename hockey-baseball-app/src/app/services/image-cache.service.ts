import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

interface CacheEntry {
  dataUrl: string;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class ImageCacheService {
  private readonly DB_NAME = 'slapshot-image-cache';
  private readonly STORE_NAME = 'images';
  private readonly DB_VERSION = 2;

  private db: IDBDatabase | null = null;
  private memoryCache = new Map<string, string>();
  private pendingFetches = new Map<string, Promise<string | null>>();
  private updateSubjects = new Map<string, Subject<string>>();

  getImage(url: string): Observable<string> {
    return new Observable((subscriber) => {
      if (!url) {
        subscriber.complete();
        return;
      }

      const cached = this.memoryCache.get(url);
      if (cached) {
        subscriber.next(cached);
      }

      const updateSubject = this.getUpdateSubject(url);
      const sub = updateSubject.subscribe((dataUrl) => subscriber.next(dataUrl));

      if (!cached) {
        this.loadFromCache(url);
      }

      this.fetchFresh(url).then((dataUrl) => {
        if (!dataUrl && !this.memoryCache.has(url)) {
          subscriber.next(url);
        }
      });

      return () => sub.unsubscribe();
    });
  }

  private getUpdateSubject(url: string): Subject<string> {
    if (!this.updateSubjects.has(url)) {
      this.updateSubjects.set(url, new Subject<string>());
    }
    return this.updateSubjects.get(url)!;
  }

  private async loadFromCache(url: string): Promise<void> {
    try {
      const entry = await this.getFromDb(url);
      if (entry && !this.memoryCache.has(url)) {
        this.memoryCache.set(url, entry.dataUrl);
        this.getUpdateSubject(url).next(entry.dataUrl);
      }
    } catch {
      // IndexedDB unavailable, continue with network fetch
    }
  }

  private async fetchFresh(url: string): Promise<string | null> {
    try {
      const dataUrl = await this.deduplicatedFetch(url);
      if (!dataUrl) return null;

      await this.storeInDb(url, dataUrl);
      this.memoryCache.set(url, dataUrl);
      this.getUpdateSubject(url).next(dataUrl);

      return dataUrl;
    } catch {
      return null;
    }
  }

  private deduplicatedFetch(url: string): Promise<string | null> {
    if (this.pendingFetches.has(url)) {
      return this.pendingFetches.get(url)!;
    }

    const promise = fetch(url, { credentials: 'include' })
      .then((response) => {
        if (!response.ok) return null;
        return response.blob();
      })
      .then((blob) => {
        if (!blob) return null;
        return this.blobToDataUrl(blob);
      })
      .catch(() => null)
      .finally(() => this.pendingFetches.delete(url));

    this.pendingFetches.set(url, promise);
    return promise;
  }

  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  private async openDb(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (db.objectStoreNames.contains(this.STORE_NAME)) {
          db.deleteObjectStore(this.STORE_NAME);
        }
        db.createObjectStore(this.STORE_NAME);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => reject(request.error);
    });
  }

  private async getFromDb(url: string): Promise<CacheEntry | null> {
    const db = await this.openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(this.STORE_NAME, 'readonly');
      const store = tx.objectStore(this.STORE_NAME);
      const request = store.get(url);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => resolve(null);
    });
  }

  private async storeInDb(url: string, dataUrl: string): Promise<void> {
    const db = await this.openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      const entry: CacheEntry = { dataUrl, timestamp: Date.now() };
      store.put(entry, url);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }
}
