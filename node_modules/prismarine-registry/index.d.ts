import {IndexedData} from 'minecraft-data'
import {NBT} from 'prismarine-nbt'

interface PCRegistry extends IndexedData {
  loadDimensionCodec(codec: NBT): void
  writeDimensionCodec(): NBT
}

interface BedrockRegistry extends IndexedData {

}
type Registry = PCRegistry & BedrockRegistry
declare function loader(mcVersion: string): Registry
export = loader
