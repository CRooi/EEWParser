import moment from 'moment'
import Epicenter from './resources/Epicenter'
import Area from './resources/Area'

export default class EEWParser {
    public readonly version: string = '1.0.0'
    public readonly telegram: string

    public isWarn: boolean = false
    public isCancel: boolean = false
    public isFinal: boolean = false
    public isEstimate: boolean = false

    public title: string = ''
    public detailOfTelegramCode: number = -1
    public detailOfTelegram: string = ''
    public issueAgencyCode: number = -1
    public issueAgency: string = ''
    public issueTypeCode: number = -1
    public issueType: string = ''
    public issueTime: string = ''

    public originTime: string = ''
    public eventID: string = ''
    public typeCode: number = -1
    public type: string = ''
    public serial: number = -1
    public epicenterCode: number = -1
    public epicenter: string = ''
    public latitude: number = -1
    public longitude: number = -1
    public depth: number = -1
    public magnitude: number = -1
    public maxIntensity: string = ''
    public epicenterAccuracyCode: number = -1
    public epicenterAccuracy: string = ''
    public depthAccuracyCode: number = -1
    public depthAccuracy: string = ''
    public magnitudeAccuracyCode: number = -1
    public magnitudeAccuracy: string = ''
    public landOrSea: '陸域' | '海域' | '不明' = '不明'
    public maxIntensityChangeCode: number = -1
    public maxIntensityChange: string = ''
    public maxIntensityChangeReasonCode: number = -1
    public maxIntensityChangeReason: string = ''

    public estIntensity: EstIntensityItem[] = []
    public warnArea: string[] = []

    public constructor(telegram: string) {
        this.telegram = telegram

        const array = this.telegram.split('\n')

        if (array[3].split(' ')[7].replace('RT', '').split('')[1] == '0') {
            this.parseEEW1()
            this.title = '緊急地震速報（予報）'
        } else {
            this.parseEEW2()
            this.title = '緊急地震速報（警報）'
        }

        if (this.detailOfTelegramCode === 39) {
            this.title = '緊急地震速報（取消）'
            this.isCancel = true
            this.isFinal = true
        }

        if (this.typeCode === 9) {
            this.isFinal = true
        }

        if (this.epicenterAccuracyCode === 1 || this.depthAccuracyCode === 1) {
            this.isEstimate = true
        }
    }

    private parseEEW1() {
        const array = this.telegram.split('\n')

        array[0].split(' ').map((item, index) => {
            if (index === 0) {
                this.detailOfTelegramCode = parseInt(item)
                this.detailOfTelegram = titleDetails[item]
            } else if (index === 1) {
                this.issueAgencyCode = parseInt(item)
                this.issueAgency = titleIssueAgencies[item]
            } else if (index === 2) {
                this.issueTypeCode = parseInt(item)
                this.issueType = titleTypes[item]
            } else if (index === 3) {
                this.issueTime = convertTime(item)
            }
        })

        this.originTime = convertTime(array[1])

        array[2].split(' ').map((item, index) => {
            if (index === 0) {
                this.eventID = item.replace('ND', '')
            } else if (index === 1) {
                const ann = item.replace('NCN', '')
                const a = ann.slice(0, 1)
                const nn = ann.slice(1)

                if (a === '0') {
                    this.typeCode = 0
                    this.type = '通常'
                } else if (a === '9') {
                    this.typeCode = 9
                    this.type = '最終の緊急地震速報（予報）'
                }

                this.serial = convertSerial(nn)
            }
        })

        array[3].split(' ').map((item, index) => {
            if (index === 0) {
                this.epicenterCode = parseInt(item)
                this.epicenter = Epicenter[this.epicenterCode]
            } else if (index === 1) {
                item = item.replace('N', '').replace('E', '-')

                this.latitude = Number(parseInt(item) / 10)
            } else if (index === 2) {
                item = item.replace('E', '').replace('W', '-')
                
                this.longitude = Number(parseInt(item) / 10)
            } else if (index === 3) {
                this.depth = parseInt(item)
            } else if (index === 4) {
                this.magnitude = parseInt(item) / 10
            } else if (index === 5) {
                this.maxIntensity = bodyIntensities[item]
            } else if (index === 6) {
                item = item.replace('RK', '')

                item.split('').map((item, index) => {
                    if (index === 0) {
                        this.epicenterAccuracyCode = parseInt(item)
                        this.epicenterAccuracy = bodyEpicenterAccuracy[item]
                    } else if (index === 1) {
                        this.depthAccuracyCode = parseInt(item)
                        this.depthAccuracy = bodyDepthAccuracy[item]
                    } else if (index === 2) {
                        this.magnitudeAccuracyCode = parseInt(item)
                        this.magnitudeAccuracy = magnitudeAccuracy[item]
                    }
                })
            } else if (index === 7) {
                item = item.replace('RT', '')

                item.split('').map((item, index) => {
                    if (index === 0) {
                        if (item === '0') {
                            this.landOrSea = '陸域'
                        } else if (item === '1') {
                            this.landOrSea = '海域'
                        }
                    } else if (index === 1) {
                        if (item === '0') {
                            this.isWarn = false
                        } else if (item === '1') {
                            this.isWarn = true
                        }
                    }
                })
            } else if (index === 8) {
                item = item.replace('RC', '')

                item.split('').map((item, index) => {
                    if (index === 0) {
                        this.maxIntensityChangeCode = parseInt(item)
                        this.maxIntensityChange = maxIntensityChange[item]
                    } else if (index === 1) {
                        this.maxIntensityChangeReasonCode = parseInt(item)
                        this.maxIntensityChangeReason = maxIntensityChangeReason[item]
                    }
                })
            }
        })

        let index = 4

        let estIntensityItems: EstIntensityItem[] = []

        while (array[index] !== '9999=') {
            if (array[index].includes('EBI')) {
                array[index] = array[4].replace('EBI ', '')
    
                let index2 = index

                while (array[index2] !== '9999=') {
                    let length = 0, count = 0

                    while (length < array[index2].length) {
                        const estIntensityItem: EstIntensityItem = {
                            area: {
                                code: -1,
                                name: ''
                            },
                            intensity: {
                                from: '',
                                to: ''
                            },
                            arrival: {
                                time: '',
                                status: {
                                    code: -1,
                                    string: ''
                                }
                            },
                            isWarn: false
                        }

                        array[index2].split(' ').map((item, index) => {
                            if (index === 0 + count) {
                                estIntensityItem.area.code = parseInt(item)
                                estIntensityItem.area.name = Area[estIntensityItem.area.code]
                            } else if (index === 1 + count) {
                                item = item.replace('S', '')
    
                                const e1e2 = item.slice(0, 2)
                                const e3e4 = item.slice(2, 4)
    
                                if (array[index2][index + 1 + count] === '//') {
                                    estIntensityItem.intensity.from = bodyIntensities[e1e2]
                                    estIntensityItem.intensity.to = '不明'
                                } else {
                                    estIntensityItem.intensity.from = bodyIntensities[e3e4]
                                    estIntensityItem.intensity.to = bodyIntensities[e1e2]
                                }
                            } else if (index === 2 + count) {
                                const str = moment(item, 'HHmmss').format('HH:mm:ss')
                                
                                if (str === 'Invalid date') {
                                    estIntensityItem.arrival.time = '不明'
                                } else {
                                    estIntensityItem.arrival.time = str
                                }
                            } else if (index === 3 + count) {
                                const y1 = item.slice(0, 1)
                                const y2 = item.slice(1, 2)
    
                                if (y1 === '0') {
                                    estIntensityItem.isWarn = false
                                } else if (y1 === '1') {
                                    estIntensityItem.isWarn = true
                                }
    
                                estIntensityItem.arrival.status.code = parseInt(y2)
                                estIntensityItem.arrival.status.string = estIntensityArrivalStatus[y2]
                            }
                        })

                        estIntensityItems.push(estIntensityItem)

                        length += 20
                        count += 4
                    }

                    index2++
                }
            }

            index++
        }

        this.estIntensity = estIntensityItems

        this.check()
    }

    private parseEEW2() {
        const array = this.telegram.split('\n')

        array[0].split(' ').map((item, index) => {
            if (index === 0) {
                this.detailOfTelegramCode = parseInt(item)
                this.detailOfTelegram = titleDetails[item]
            } else if (index === 1) {
                this.issueAgencyCode = parseInt(item)
                this.issueAgency = titleIssueAgencies[item]
            } else if (index === 2) {
                this.issueTypeCode = parseInt(item)
                this.issueType = titleTypes[item]
            } else if (index === 3) {
                this.issueTime = convertTime(item)
            }
        })

        this.originTime = convertTime(array[1])

        array[2].split(' ').map((item, index) => {
            if (index === 0) {
                this.eventID = item.replace('ND', '')
            } else if (index === 1) {
                const ann = item.replace('NCN', '')
                const a = ann.slice(0, 1)
                const nn = ann.slice(1)

                if (a === '0') {
                    this.typeCode = 0
                    this.type = '通常'
                } else if (a === '9') {
                    this.typeCode = 9
                    this.type = '最終の緊急地震速報（警報）'
                }

                this.serial = convertSerial(nn)
            }
        })

        array[3].split(' ').map((item, index) => {
            if (index === 0) {
                this.epicenterCode = parseInt(item)
                this.epicenter = Epicenter[this.epicenterCode]
            } else if (index === 1) {
                item = item.replace('N', '').replace('E', '-')

                this.latitude = Number(parseInt(item) / 10)
            } else if (index === 2) {
                item = item.replace('E', '').replace('W', '-')
                
                this.longitude = Number(parseInt(item) / 10)
            } else if (index === 3) {
                this.depth = parseInt(item)
            } else if (index === 4) {
                this.magnitude = parseInt(item) / 10
            } else if (index === 5) {
                this.maxIntensity = bodyIntensities[item]
            } else if (index === 6) {
                item = item.replace('RK', '')

                item.split('').map((item, index) => {
                    if (index === 0) {
                        this.epicenterAccuracyCode = parseInt(item)
                        this.epicenterAccuracy = bodyEpicenterAccuracy[item]
                    } else if (index === 1) {
                        this.depthAccuracyCode = parseInt(item)
                        this.depthAccuracy = bodyDepthAccuracy[item]
                    } else if (index === 2) {
                        this.magnitudeAccuracyCode = parseInt(item)
                        this.magnitudeAccuracy = magnitudeAccuracy[item]
                    }
                })
            } else if (index === 7) {
                item = item.replace('RT', '')

                item.split('').map((item, index) => {
                    if (index === 0) {
                        if (item === '0') {
                            this.landOrSea = '陸域'
                        } else if (item === '1') {
                            this.landOrSea = '海域'
                        }
                    } else if (index === 1) {
                        if (item === '0') {
                            this.isWarn = false
                        } else if (item === '1') {
                            this.isWarn = true
                        }
                    }
                })
            } else if (index === 8) {
                item = item.replace('RC', '')

                item.split('').map((item, index) => {
                    if (index === 0) {
                        this.maxIntensityChangeCode = parseInt(item)
                        this.maxIntensityChange = maxIntensityChange[item]
                    } else if (index === 1) {
                        this.maxIntensityChangeReasonCode = parseInt(item)
                        this.maxIntensityChangeReason = maxIntensityChangeReason[item]
                    }
                })
            }
        })

        let index = 4

        let estIntensityItems: EstIntensityItem[] = []

        while (array[index] !== '9999=') {
            if (array[index].includes('EBI')) {
                array[index] = array[4].replace('EBI ', '')
    
                let index2 = index

                while (array[index2] !== '9999=') {
                    let length = 0, count = 0

                    while (length < array[index2].length) {
                        const estIntensityItem: EstIntensityItem = {
                            area: {
                                code: -1,
                                name: ''
                            },
                            intensity: {
                                from: '',
                                to: ''
                            },
                            arrival: {
                                time: '',
                                status: {
                                    code: -1,
                                    string: ''
                                }
                            },
                            isWarn: false
                        }

                        array[index2].split(' ').map((item, index) => {
                            if (index === 0 + count) {
                                estIntensityItem.area.code = parseInt(item)
                                estIntensityItem.area.name = Area[estIntensityItem.area.code]
                            } else if (index === 1 + count) {
                                item = item.replace('S', '')
    
                                const e1e2 = item.slice(0, 2)
                                const e3e4 = item.slice(2, 4)
    
                                if (array[index2][index + 1 + count] === '//') {
                                    estIntensityItem.intensity.from = bodyIntensities[e1e2]
                                    estIntensityItem.intensity.to = '不明'
                                } else {
                                    estIntensityItem.intensity.from = bodyIntensities[e3e4]
                                    estIntensityItem.intensity.to = bodyIntensities[e1e2]
                                }
                            } else if (index === 2 + count) {
                                const str = moment(item, 'HHmmss').format('HH:mm:ss')
                                
                                if (str === 'Invalid date') {
                                    estIntensityItem.arrival.time = '不明'
                                } else {
                                    estIntensityItem.arrival.time = str
                                }
                            } else if (index === 3 + count) {
                                const y1 = item.slice(0, 1)
                                const y2 = item.slice(1, 2)
    
                                if (y1 === '0') {
                                    estIntensityItem.isWarn = false
                                } else if (y1 === '1') {
                                    estIntensityItem.isWarn = true
                                    this.warnArea.push(estIntensityItem.area.name)
                                }
    
                                estIntensityItem.arrival.status.code = parseInt(y2)
                                estIntensityItem.arrival.status.string = estIntensityArrivalStatus[y2]
                            }
                        })

                        estIntensityItems.push(estIntensityItem)

                        length += 20
                        count += 4
                    }

                    index2++
                }
            }

            index++
        }

        this.estIntensity = estIntensityItems

        this.check()
    }

    private check() {
        const properties = Object.getOwnPropertyNames(this)

        for (const propertyName of properties) {
            const propertyValue = (this as any)[propertyName]

            if (typeof propertyValue == 'object') {
                (this as any)[propertyName] = JSON.parse(JSON.stringify(propertyValue).replace(/undefined/g, '不明').replace(/NaN/g, '-1'))
            }

            if (propertyValue === undefined) {
                (this as any)[propertyName] = '不明'
            } else if (Number.isNaN(propertyValue)) {
                (this as any)[propertyName] = -1
            }
        }
    }

    public toJSON() {
        if (this.isCancel) {
            return {
                parse: {
                    status: 'success',
                    version: this.version
                },
                title: {
                    code: this.detailOfTelegramCode,
                    string: this.title,
                    detail: this.detailOfTelegram
                },
                issue: {
                    type: {
                        code: this.issueTypeCode,
                        string: this.issueType
                    },
                    agency: {
                        code: this.issueAgencyCode,
                        string: this.issueAgency
                    },
                    time: this.issueTime
                },
                originTime: this.originTime,
                eventID: this.eventID,
                type: {
                    code: this.typeCode,
                    string: this.type
                },
                serial: this.serial,
                isCancel: this.isCancel,
                isWarn: this.isWarn,
                isFinal: this.isFinal,
                originalTelegram: this.telegram.replace(/\n/g, ' ')
            } as EEWJSON
        }

        if (this.isWarn) {
            return {
                parse: {
                    status: 'success',
                    version: this.version
                },
                title: {
                    code: this.detailOfTelegramCode,
                    string: this.title,
                    detail: this.detailOfTelegram
                },
                issue: {
                    type: {
                        code: this.issueTypeCode,
                        string: this.issueType
                    },
                    agency: {
                        code: this.issueAgencyCode,
                        string: this.issueAgency
                    },
                    time: this.issueTime
                },
                originTime: this.originTime,
                eventID: this.eventID,
                type: {
                    code: this.typeCode,
                    string: this.type
                },
                serial: this.serial,
                isCancel: this.isCancel,
                isWarn: this.isWarn,
                isFinal: this.isFinal,
                hypocenter: {
                    code: this.epicenterCode,
                    name: this.epicenter,
                    isEstimate: this.isEstimate,
                    location: {
                        lng: this.longitude,
                        lat: this.latitude,
                        depth: this.depth
                    },
                    magnitude: this.magnitude,
                    accuracy: {
                        epicenter: {
                            code: this.epicenterAccuracyCode,
                            string: this.epicenterAccuracy
                        },
                        depth: {
                            code: this.depthAccuracyCode,
                            string: this.depthAccuracy
                        },
                        magnitude: {
                            code: this.magnitudeAccuracyCode,
                            string: this.magnitudeAccuracy
                        }
                    },
                    landOrSea: this.landOrSea
                },
                maxIntensity: this.maxIntensity,
                estIntensity: this.estIntensity,
                warnArea: this.warnArea,
                maxIntensityChange: {
                    code: this.maxIntensityChangeCode,
                    string: this.maxIntensityChange,
                    reason: {
                        code: this.maxIntensityChangeReasonCode,
                        string: this.maxIntensityChangeReason
                    }
                },
                originalTelegram: this.telegram.replace(/\n/g, ' ')
            } as EEWJSON
        }

        if (!this.isWarn && this.telegram.includes('EBI')) {
            return {
                parse: {
                    status: 'success',
                    version: this.version
                },
                title: {
                    code: this.detailOfTelegramCode,
                    string: this.title,
                    detail: this.detailOfTelegram
                },
                issue: {
                    type: {
                        code: this.issueTypeCode,
                        string: this.issueType
                    },
                    agency: {
                        code: this.issueAgencyCode,
                        string: this.issueAgency
                    },
                    time: this.issueTime
                },
                originTime: this.originTime,
                eventID: this.eventID,
                type: {
                    code: this.typeCode,
                    string: this.type
                },
                serial: this.serial,
                isCancel: this.isCancel,
                isWarn: this.isWarn,
                isFinal: this.isFinal,
                hypocenter: {
                    code: this.epicenterCode,
                    name: this.epicenter,
                    isEstimate: this.isEstimate,
                    location: {
                        lng: this.longitude,
                        lat: this.latitude,
                        depth: this.depth
                    },
                    magnitude: this.magnitude,
                    accuracy: {
                        epicenter: {
                            code: this.epicenterAccuracyCode,
                            string: this.epicenterAccuracy
                        },
                        depth: {
                            code: this.depthAccuracyCode,
                            string: this.depthAccuracy
                        },
                        magnitude: {
                            code: this.magnitudeAccuracyCode,
                            string: this.magnitudeAccuracy
                        }
                    },
                    landOrSea: this.landOrSea
                },
                maxIntensity: this.maxIntensity,
                estIntensity: this.estIntensity,
                maxIntensityChange: {
                    code: this.maxIntensityChangeCode,
                    string: this.maxIntensityChange,
                    reason: {
                        code: this.maxIntensityChangeReasonCode,
                        string: this.maxIntensityChangeReason
                    }
                },
                originalTelegram: this.telegram.replace(/\n/g, ' ')
            } as EEWJSON
        }

        if (!this.isWarn) {
            return {
                parse: {
                    status: 'success',
                    version: this.version
                },
                title: {
                    code: this.detailOfTelegramCode,
                    string: this.title,
                    detail: this.detailOfTelegram
                },
                issue: {
                    type: {
                        code: this.issueTypeCode,
                        string: this.issueType
                    },
                    agency: {
                        code: this.issueAgencyCode,
                        string: this.issueAgency
                    },
                    time: this.issueTime
                },
                originTime: this.originTime,
                eventID: this.eventID,
                type: {
                    code: this.typeCode,
                    string: this.type
                },
                serial: this.serial,
                isCancel: this.isCancel,
                isWarn: this.isWarn,
                isFinal: this.isFinal,
                hypocenter: {
                    code: this.epicenterCode,
                    name: this.epicenter,
                    isEstimate: this.isEstimate,
                    location: {
                        lng: this.longitude,
                        lat: this.latitude,
                        depth: this.depth
                    },
                    magnitude: this.magnitude,
                    accuracy: {
                        epicenter: {
                            code: this.epicenterAccuracyCode,
                            string: this.epicenterAccuracy
                        },
                        depth: {
                            code: this.depthAccuracyCode,
                            string: this.depthAccuracy
                        },
                        magnitude: {
                            code: this.magnitudeAccuracyCode,
                            string: this.magnitudeAccuracy
                        }
                    },
                    landOrSea: this.landOrSea
                },
                maxIntensity: this.maxIntensity,
                maxIntensityChange: {
                    code: this.maxIntensityChangeCode,
                    string: this.maxIntensityChange,
                    reason: {
                        code: this.maxIntensityChangeReasonCode,
                        string: this.maxIntensityChangeReason
                    }
                },
                originalTelegram: this.telegram.replace(/\n/g, ' ')
            } as EEWJSON
        }
    }
}

interface EEWJSON {
    parse: {
        status: 'success' | 'error'
        version: string
    }
    title: {
        code: number
        string: string
        detail: string
    }
    issue: {
        type: {
            code: number
            string: string
        }
        agency: {
            code: number
            string: string
        }
        time: string
    }
    originTime: string
    eventID: string
    type: {
        code: number
        string: string
    }
    serial: number
    isCancel: boolean
    isWarn: boolean
    isFinal: boolean
    hypocenter?: {
        code: number
        name: string
        isEstimate: boolean
        location: {
            lng: number
            lat: number
            depth: number
        }
        magnitude: number
        accuracy: {
            epicenter: {
                code: number
                string: string
            }
            depth: {
                code: number
                string: string
            }
            magnitude: {
                code: number
                string: string
            }
        }
        landOrSea: '陸域' | '海域' | '不明'
    }
    maxIntensity: string
    estIntensity?: EstIntensityItem[]
    warnArea?: string[]
    maxIntensityChange?: {
        code: number
        string: string
        reason: {
            code: number
            string: string
        }
    },
    originalTelegram: string
}

interface StrIndex {
    [key: string]: string
}

interface EstIntensityItem {
    area: {
        code: number
        name: string
    }
    intensity: {
        from: string
        to: string
    }
    arrival: {
        time: string
        status: {
            code: number
            string: string
        }
    }
    isWarn: boolean
}

const titleDetails: StrIndex = {
    '35': '最大予測震度のみの緊急地震速報',
    '36': 'マグニチュード、最大予測震度及び主要動到達予測時刻の緊急地震速報',
    '37': 'マグニチュード、最大予測震度及び主要動到達時刻の緊急地震速報',
    '38': 'テスト電文',
    '39': 'キャンセル（取り消し）情報',
    '47': '般向け緊急地震速報',
    '48': 'キャンセル報',
    '61': 'リアルタイム震度電文（工学的基盤面の値）、リアルタイム震度電文のキャンセル報'
}

const titleIssueAgencies: StrIndex = {
    '01': '札幌管区気象台',
    '02': '仙台管区気象台',
    '03': '気象庁本庁',
    '04': '大阪管区気象台',
    '05': '福岡管区気象台'
}

const titleTypes: StrIndex = {
    '00': '通常',
    '01': '訓練',
    '10': '通常の取り消し',
    '11': '訓練の取り消し',
    '20': '参考情報またはテスト電文',
    '30': 'コード部全体の配信試験'
}

const bodyIntensities: StrIndex = {
    '//': '不明',
    '01': '1',
    '02': '2',
    '03': '3',
    '04': '4',
    '5-': '5弱',
    '5+': '5強',
    '6-': '6弱',
    '6+': '6強',
    '07': '7'
}

const bodyEpicenterAccuracy: StrIndex = {
    '1': 'P波/S波レベル越え、IPF法（1点）、または仮定震源要素',
    '2': 'IPF法（2点）',
    '3': 'IPF法（3点/4点）',
    '4': 'IPF法（5点以上）',
    '5': '防災科研システム（4点以下、または精度情報なし）',
    '6': '防災科研システム（5点以上）[防災科学技術研究所データ]',
    '7': 'EPOS（海域[観測網外]）',
    '8': 'EPOS（内陸[観測網内]）',
    '9': '予備'
}

const bodyDepthAccuracy: StrIndex = {
    '1': 'P波/S波レベル越え、IPF法（1点）、または仮定震源要素',
    '2': 'IPF法（2点）',
    '3': 'IPF法（3点/4点）',
    '4': 'IPF法（5点以上）',
    '5': '防災科研システム（4点以下、または精度情報なし）',
    '6': '防災科研システム（5点以上）[防災科学技術研究所データ]',
    '7': 'EPOS（海域[観測網外]）',
    '8': 'EPOS（内陸[観測網内]）',
    '9': '予備'
}

const magnitudeAccuracy: StrIndex = {
    '2': '防災科研システム[防災科学技術研究所データ]',
    '3': '全点P相',
    '4': 'P相/全相混在',
    '5': '全点全相',
    '6': 'EPOS',
    '8': 'P波/S波レベル越え、または仮定震源要素',
    '9': '予備'
}

const maxIntensityChange: StrIndex = {
    '0': 'ほとんど変化なし',
    '1': '最大予測震度が1.0以上大きくなった',
    '2': '最大予測震度が1.0以上小さくなった'
}

const maxIntensityChangeReason: StrIndex = {
    '0': '変化なし',
    '1': '主としてMが変化したため（1.0以上）',
    '2': '主として震源位置が変化したため（10.0km以上）',
    '3': 'M及び震源位置が変化したため（M1.0以上、または震源位置10.0km以上）',
    '4': '震源の深さが変化したため（30.0km以上）',
    '9': 'PLUM法による予測により変化したため'
}

const estIntensityArrivalStatus: StrIndex = {
    '0': '未到達',
    '1': '既に到達と予測',
    '9': '主要動到達時刻の予測なし（PLUM法による予測）'
}

const convertTime = (str: string) => {
    return moment(str, 'YYMMDDHHmmss').format('YYYY-MM-DD HH:mm:ss')
}

const convertSerial = (str: string) => {
    if (/^\d+$/.test(str)) {
        return Number(str)
    } else if (/^[A-Z]/.test(str)) {
        const letterCode = str.charCodeAt(0) - 64
        const remainingDigits = str.slice(1)
        if (/^\d+$/.test(remainingDigits)) {
            return letterCode * 100 + Number(remainingDigits)
        }
    }

    return -1
}