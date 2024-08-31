import {PetpetTemplatePreview} from "../template-selector";
import './websafe-fonts.css'

export const INDEX_FILE = 'index.json'
export const INDEX_MAP_FILE = 'index.map.json'
export const DEFAULT_DATA_PATH = './data/xmmt.dituon.petpet'
export const DEFAULT_PREVIEW_PATH = '/preview'

export const WEB_SAFE_FONTS = [
    'Arial',
    'Arial Black',
    'Comic Sans MS',
    'Courier New',
    'Georgia',
    'Impact',
    'Lucida Console',
    'Lucida Sans Unicode',
    'Palatino Linotype',
    'Tahoma',
    'Times New Roman',
    'Trebuchet MS',
    'Verdana'
]

export interface RepoIndex {
    version: number
    dataPath?: string
    previewPath?: string
    dataList: string[]
    fontList: string[]
}

export interface RepoIndexMap {
    length: {
        [key: string]: number
    }
    alias: {
        [key: string]: string[]
    }
    type: {
        [key: string]: string
    }
}

export class RepoLoader {
    private urls: string[]
    private urlSet: Set<string> = new Set()
    private readonly initPromise: Promise<void>
    private idMap: Map<string, string>
    private readonly lengthMap: Map<string, number> = new Map()
    private readonly aliasMap: Map<string, string[]> = new Map()
    private fonts: string[]
    private fontPromises: Promise<void>[] = []

    constructor(urls: string[]) {
        this.urls = [...new Set(urls)]
        this.initPromise = this.init()
    }

    private async init() {
        const idMap: Map<string, string> = new Map()
        const fontMap: Map<string, string> = new Map()

        await Promise.allSettled(this.urls.map(async url => {
            const index = await fetch(`${url}/${INDEX_FILE}`).then(p => p.json())
            const {dataPath = DEFAULT_DATA_PATH, dataList, fontList} = index as RepoIndex
            try {
                const indexMap: RepoIndexMap = await fetch(`${url}/${INDEX_MAP_FILE}`).then(p => p.json())
                Object.entries(indexMap.length).forEach(([k, v]) => this.lengthMap.set(k, v))
                Object.entries(indexMap.alias).forEach(([k, v]) => this.aliasMap.set(k, v))
            } catch (e) {
                console.warn(`cannot find index.map.json in ${url} `)
            }

            for (const id of dataList) {
                if (idMap.has(id)) continue
                idMap.set(id, `${url}/${dataPath}/${id}`)
            }
            for (const font of fontList) {
                if (fontMap.has(font)) continue
                fontMap.set(font, `${url}/${dataPath}/fonts/${font}`)
            }
            this.urlSet.add(url)
        }))

        this.idMap = idMap

        for (let [fontName, fontUrl] of fontMap) {
            fontName = fontName.split('.')[0]
            console.log(fontName, fontUrl)
            const font = new FontFace(fontName, `url(${fontUrl})`)
            this.fontPromises.push(font.load().then(font => {
                // @ts-ignore
                document.fonts.add(font)
            }))
        }
    }

    async getIdMap() {
        await this.initPromise
        return this.idMap
    }

    async getLengthMap() {
        await this.initPromise
        return this.lengthMap
    }

    async getPreviewList(): Promise<PetpetTemplatePreview[]> {
        const idMap = await this.getIdMap()
        const templates = []
        for (const [id, url] of idMap.entries()) {
            templates.push({
                key: id,
                url: url,
                alias: this.aliasMap.get(id)
            })
        }
        return templates
    }

    async getFonts() {
        await this.initPromise
        await Promise.all(this.fontPromises)
        return this.fonts
    }

    async getUrlSet() {
        await this.initPromise
        return this.urlSet
    }
}