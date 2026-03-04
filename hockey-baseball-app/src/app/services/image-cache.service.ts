import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

interface CacheEntry {
  blob: Blob;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class ImageCacheService {
  private readonly DB_NAME = 'slapshot-image-cache';
  private readonly STORE_NAME = 'images';
  private readonly DB_VERSION = 1;

  private db: IDBDatabase | null = null;
  private memoryCache = new Map<string, string>();
  private pendingFetches = new Map<string, Promise<Blob | null>>();
  private updateSubjects = new Map<string, Subject<string>>();

  getImage(url: string): Observable<string> {
    return new Observable((subscriber) => {
      if (!url) {
        subscriber.complete();
        return;
      }

      const memoryUrl = this.memoryCache.get(url);
      if (memoryUrl) {
        subscriber.next(memoryUrl);
      }

      const updateSubject = this.getUpdateSubject(url);
      const sub = updateSubject.subscribe((blobUrl) => subscriber.next(blobUrl));

      if (!memoryUrl) {
        this.loadFromCache(url);
      }

      this.fetchFresh(url);

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
        const blobUrl = URL.createObjectURL(entry.blob);
        this.memoryCache.set(url, blobUrl);
        this.getUpdateSubject(url).next(blobUrl);
      }
    } catch {
      // IndexedDB unavailable, continue with network fetch
    }
  }

  private async fetchFresh(url: string): Promise<void> {
    try {
      const blob = await this.deduplicatedFetch(url);
      if (!blob) return;

      await this.storeInDb(url, blob);

      const oldBlobUrl = this.memoryCache.get(url);
      const newBlobUrl = URL.createObjectURL(blob);
      this.memoryCache.set(url, newBlobUrl);
      this.getUpdateSubject(url).next(newBlobUrl);

      if (oldBlobUrl) {
        URL.revokeObjectURL(oldBlobUrl);
      }
    } catch {
      // Network error, cached version (if any) remains
    }
  }

  private deduplicatedFetch(url: string): Promise<Blob | null> {
    if (this.pendingFetches.has(url)) {
      return this.pendingFetches.get(url)!;
    }

    const promise = fetch(url, { credentials: 'include' })
      .then((response) => {
        if (!response.ok) return null;
        return response.blob();
      })
      .catch(() => null)
      .finally(() => this.pendingFetches.delete(url));

    this.pendingFetches.set(url, promise);
    return promise;
  }

  private async openDb(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME);
        }
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

  private async storeInDb(url: string, blob: Blob): Promise<void> {
    const db = await this.openDb();
    return new Promise((resolve) => {
      const tx = db.transaction(this.STORE_NAME, 'readwrite');
      const store = tx.objectStore(this.STORE_NAME);
      const entry: CacheEntry = { blob, timestamp: Date.now() };
      store.put(entry, url);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  }
}
