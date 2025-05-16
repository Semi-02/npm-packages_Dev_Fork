import { execSync } from 'node:child_process';
import * as P from "./paths";
import fs from "node:fs";
import { Context } from './context';
import path from 'node:path';
import { mac_12char } from './utils';
import { FindProbablePorts } from './esp32';
import * as os from "node:os"
//Für macOS
import { exec } from "child_process";
import { promisify } from "util";

//Für MacOS
const execAsync = promisify(exec);

export enum EncryptionStrength {
  AES128 = 256,//AES-128 (256-bit key)
  AES256 = 512,//AES-256 (512-bit key)
};


const IDF_PATH = globalThis.process.env.IDF_PATH as string;
//Location of esp idf tools
const NVS_PARTITION_GEN_TOOL = path.join(IDF_PATH, "components/nvs_flash/nvs_partition_generator/nvs_partition_gen.py");

export async function createRandomFlashEncryptionKeyLazily(c: Context, keySize: EncryptionStrength) {
  const path = c.p.boardSpecificPath(P.FLASH_KEY_SUBDIR, P.FLASH_KEY_FILENAME);
  if (fs.existsSync(path)) {
    console.info(`flash_encryption key for board  ${c.b.board_name} ${c.b.board_version} with mac 0x${mac_12char(c.b.mac)} has already been created.`);
    return;
  }
  c.p.createBoardSpecificPathLazy(P.FLASH_KEY_SUBDIR);
  espsecure(`generate_flash_encryption_key --keylen ${keySize} ${path}`, (line) => true);
  console.log('Random Flash Encryption Key successfully generated');
}

export async function burnFlashEncryptionKeyAndActivateEncryptedFlash(c: Context, keySize: EncryptionStrength) {
  if (c.b.flash_encryption_key_burned_and_activated) {
    console.info(`flash_encryption key for board  ${c.b.board_name} ${c.b.board_version} with mac 0x${mac_12char(c.b.mac)} has already been burned to efuse and has been activated`);
    return;
  }
  const pi = (await FindProbablePorts())[0];
  const path=c.p.boardSpecificPath(P.FLASH_KEY_SUBDIR, P.FLASH_KEY_FILENAME);
  const sizeByte = fs.statSync(path).size;
  if (sizeByte != keySize / 8) {
    throw Error(`flash_encryption key for board  ${c.b.board_name} ${c.b.board_version} with mac 0x${mac_12char(c.b.mac)} has already been created, but with wrong size! (is:${sizeByte}Byte, shall:${keySize}/8 byte)`);
  }
  if (keySize == EncryptionStrength.AES128) {
    espefuse(`--port ${pi.path} --do-not-confirm burn_key BLOCK_KEY0 ${path} XTS_AES_128_KEY`, (l) => false);
  } else if (keySize == EncryptionStrength.AES256) {
    espefuse(`--port ${pi.path} --do-not-confirm burn_key BLOCK_KEY0 ${path} XTS_AES_256_KEY`, (l) => false);
  } else {
    throw Error(`KeySize ${keySize} not implemented`);
  }
  espefuse(`--port ${pi.path} --do-not-confirm burn_efuse SPI_BOOT_CRYPT_CNT 1`, (l) => false);
  console.log('Random Flash Encryption Key successfully burned to EFUSE; encryption of flash activated!');
  c.setFlashEncryptionKeyBurnedAndActivated();
}

interface IPartitionTableEntry {
  Name: string;
  Type: string;
  SubType: string;
  Offset?: number; // Offset ist jetzt ein optionaler numerischer Wert.
  Size: number;    // Size ist ein numerischer Wert.
  Flags?: string;  // Flags sind weiterhin optional und vom Typ string.
}

function parsePartitionsCSVFromFile(filePath: string): IPartitionTableEntry[] {
  // Lese den gesamten Inhalt der Datei als String.
  const csvData = fs.readFileSync(filePath, 'utf8');

  // Parsen der CSV-Daten.
  const lines = csvData.split('\n');
  const entries: IPartitionTableEntry[] = [];

  // Beginne ab der dritten Zeile zu parsen, da die ersten zwei Zeilen Kommentare sind.
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') continue; // Überspringe leere Zeilen.
    const values = line.split(',');

    // Erstelle ein Entry und füge es zur Liste hinzu.
    const entry: IPartitionTableEntry = {
      Name: values[0],
      Type: values[1],
      SubType: values[2],
      Offset: values[3] ? parseInt(values[3], 16) : undefined, // Konvertiere Offset nach Nummer (hexadezimal).
      Size: parseInt(values[4], 16), // Konvertiere Size nach Nummer (hexadezimal).
      Flags: values[5] || undefined, // Flags bleiben undefined, wenn sie leer sind.
    };

    entries.push(entry);
  }
  return entries;
}




export async function buildFirmware(c: Context) {
  await exec_in_idf_terminal(`idf.py build`, c.c.idfProjectDirectory, (l) => l.startsWith("Successfully created"));
}

/*
With flash encryption enabled, the following types of data are encrypted by default:
Second Stage Bootloader (Firmware Bootloader)
Partition Table
NVS Key Partition
Otadata
All app type partitions
*/

export async function encryptPartitions_Bootloader_App_PartitionTable_OtaData(c: Context) {
  if (!c.f) {
    throw new Error("Fehler: c.f (Flasher-Konfiguration) ist null. Build war evtl. nicht erfolgreich oder flasher_args.json fehlt.");
  }

  [c.f.bootloader, c.f.app, c.f["partition-table"], c.f.otadata].forEach(s => {
    espsecure(
      `encrypt_flash_data --aes_xts --keyfile "${c.p.boardSpecificPath(P.FLASH_KEY_SUBDIR, P.FLASH_KEY_FILENAME)}" --address ${s.offset} --output "${path.join(c.p.P_BUILD, s.file.replace(".bin", "-enc.bin"))}" "${path.join(c.p.P_BUILD, s.file)}"`,
      () => false
    );
  });

  console.log('Encryption finished');
}

export function nvs_partition_gen(c: Context, encrypt: boolean, filterStdOut: (line: string) => boolean): Section {
  const nvsPartitionInfo: IPartitionTableEntry = parsePartitionsCSVFromFile(path.join(c.c.idfProjectDirectory, "partitions.csv")).find((e) => e.Name == "nvs")!;
  const p=c.p;
  if (nvsPartitionInfo.Size % 4096 != 0) {
    throw new Error(`size_of_nvs_partition_kibibytes must be a multiple of 4096`)
  }
  if (!nvsPartitionInfo.Offset) {
    throw new Error(`nvsPartitionInfo.Offset must be defined`)
  }

  if (encrypt) {
    const cmd = `python3 ${NVS_PARTITION_GEN_TOOL} encrypt --inputkey " NO THIS IS NOT THE FLASH KEY, THIS IS A SEPARATE KEY SPECIFIC FOR NVS ENCRYPTION, see https://docs.espressif.com/projects/esp-idf/en/v5.4/esp32s3/api-reference/storage/nvs_encryption.html ${p.boardSpecificPath(P.FLASH_KEY_SUBDIR, P.FLASH_KEY_FILENAME)}" "${path.join(p.GENERATED_USERSETTINGS, P.NVS_CSV_FILENAME)}" "${path.join(p.GENERATED_USERSETTINGS, P.NVS_PARTITION_BIN_FILENAME)}" ${nvsPartitionInfo.Size}`
    exec_in_idf_terminal(cmd, c.c.idfProjectDirectory, filterStdOut)
    return { encrypted: true, file: path.join(p.GENERATED_USERSETTINGS, P.NVS_PARTITION_ENC_BIN_FILENAME), offset: nvsPartitionInfo.Offset!.toString() };
  } else {
    const cmd = `python3 ${NVS_PARTITION_GEN_TOOL} generate  "${path.join(p.GENERATED_USERSETTINGS, P.NVS_CSV_FILENAME)}" "${path.join(p.GENERATED_USERSETTINGS, P.NVS_PARTITION_BIN_FILENAME)}" ${nvsPartitionInfo.Size}`
    exec_in_idf_terminal(cmd, c.c.idfProjectDirectory, filterStdOut)
    return { encrypted: false, file: path.join(p.GENERATED_USERSETTINGS, P.NVS_PARTITION_BIN_FILENAME), offset: nvsPartitionInfo.Offset!.toString() };
  }
}

export async function flashEncryptedFirmware(c: Context, write_nvs: boolean, nvs_is_encrypted: boolean, write_storage: boolean) {
  const pi = (await FindProbablePorts())[0];
  const sections: Array<Section> = [c.f!.bootloader, c.f!.app, c.f!["partition-table"], c.f!.otadata]

  sections.forEach(e => e.file = path.join(c.p.P_BUILD, e.file.replace(".bin", "-enc.bin")))//change filename to encrypted
  if (write_storage) {
    c.f!.storage.file = path.join(c.p.P_BUILD, c.f!.storage.file)
    sections.push(c.f!.storage); //c.f!.storage is not encrypted!
  }

  if (fs.existsSync(path.join(c.p.GENERATED_USERSETTINGS, P.NVS_PARTITION_BIN_FILENAME))) {
    const nvsPartitionInfo: IPartitionTableEntry = parsePartitionsCSVFromFile(path.join(c.c.idfProjectDirectory, "partitions.csv")).find((e) => e.Name == "nvs")!;
    if (!nvsPartitionInfo.Offset) throw new Error(`nvsPartitionInfo.Offset must be defined`)
    //FOR FUTURE: add nvs-partition only if it exists, filename needs not to be changed, as it is created directly encrypted with correct filename
    //NOW: nvs-Partition is not encrypted
    if (write_nvs) {
      if (nvs_is_encrypted) {
        sections.push({ encrypted: true, file: path.join(c.p.GENERATED_USERSETTINGS, P.NVS_PARTITION_ENC_BIN_FILENAME), offset: nvsPartitionInfo.Offset!.toString() })
      } else {
        sections.push({ encrypted: false, file: path.join(c.p.GENERATED_USERSETTINGS, P.NVS_PARTITION_BIN_FILENAME), offset: nvsPartitionInfo.Offset!.toString() })
      }
    }
  }
  var cmd = `--port ${pi.path} write_flash --flash_size keep`
  sections.forEach(s => {cmd += ` ${s.offset} ${s.file}`;})
  await esptool(cmd, (line) => line.startsWith("Wrote") || line.startsWith("Hash"))
  console.log('Flash (encrypted) finished');
}

export async function flashFirmware(c: Context, write_nvs: boolean, write_storage: boolean) {
  const pi = (await FindProbablePorts())[0];
  const sections: Array<Section> = [c.f!.bootloader, c.f!.app, c.f!["partition-table"], c.f!.otadata]
  if (write_storage) {
    sections.push(c.f!.storage);
  }
  sections.forEach(e => e.file = path.join(c.p.P_BUILD, e.file))//add path to filename
  if (write_nvs) {
    const nvsPartitionInfo: IPartitionTableEntry = parsePartitionsCSVFromFile(path.join(c.c.idfProjectDirectory, "partitions.csv")).find((e) => e.Name == "nvs")!;
    if (!nvsPartitionInfo.Offset) throw new Error(`nvsPartitionInfo.Offset must be defined`)
    if (!fs.existsSync(path.join(c.p.GENERATED_USERSETTINGS, P.NVS_PARTITION_BIN_FILENAME))) throw new Error(`nvs partition image does not exist`)
    sections.push({ encrypted: false, file: path.join(c.p.GENERATED_USERSETTINGS, P.NVS_PARTITION_BIN_FILENAME), offset: nvsPartitionInfo.Offset!.toString() })
  }
  var cmd = `--port ${pi.path} write_flash --flash_size keep`;
  sections.forEach(s => {cmd += ` ${s.offset} ${s.file}`;})
  esptool(cmd, (line) => line.startsWith("Wrote") || line.startsWith("Hash"))
  console.log('Flash (not encrypted) finished');
}




export function GetProjectDescription(espIdfProjectDirectory: string): IIdfProjectInfo | null {
  const p = path.join(espIdfProjectDirectory, "build", "project_description.json");
  if (!fs.existsSync(p)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(p).toString()) as IIdfProjectInfo;
}

export function GetFlashArgs(espIdfProjectDirectory: string): IFlasherConfiguration | null {
  const p = path.join(espIdfProjectDirectory, "build", "flasher_args.json");
  if (!fs.existsSync(p)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(p).toString()) as IFlasherConfiguration;
}

export function espefuse(params: string, filterStdOut: (line: string) => boolean) {
  tool("espefuse.py", params, filterStdOut)
}

export function espsecure(params: string, filterStdOut: (line: string) => boolean) {
  tool("espsecure.py", params, filterStdOut)
}

export async function esptool(params: string, filterStdOut: (line: string) => boolean, workingDirectory: string = "./") {
  await tool("esptool.py", params, filterStdOut, workingDirectory)
}


export async function tool(tool: string, params: string, filterStdOut: (line: string) => boolean = (l) => true, workingDirectory: string = "./") {
  const cmd = `python3 ${path.join(IDF_PATH, "components", "esptool_py", "esptool", tool)} ${params} `
  await exec_in_idf_terminal(cmd, workingDirectory, filterStdOut)
}

export function spiffsgen_deprecated_use_littlefs_instead(image_size: number, base_dir: string, output_file: string, filterStdOut: (line: string) => boolean = (l) => true, workingDirectory: string = "./") {
  const cmd = `python3 spiffsgen.py ${image_size} ${base_dir} ${output_file} `
  exec_in_idf_terminal(cmd, workingDirectory, filterStdOut)
}

export async function exec_in_idf_terminal(
  command: string,
  idfProjectDirectory: string,
  filterStdOut: (line: string) => boolean
): Promise<void> {
  const exportScript = path.join(IDF_PATH, "export.sh");
  const cmd = `bash -c 'source "${exportScript}" && ${command}'`;

  console.info(`Executing: ${cmd}`);

  try {
    const { stdout, stderr } = await execAsync(cmd, {
      cwd: idfProjectDirectory,
      env: process.env,
    });

    if (stderr) console.warn(stderr);

    if (stdout) {
      stdout
        .toString()
        .split(os.EOL)
        .filter(filterStdOut)
        .forEach((line) => console.log(line));
    }
  } catch (error) {
    console.error("Execution failed:", error);
  }
}

export interface ConfigEnvironment {
  COMPONENT_KCONFIGS: string;
  COMPONENT_KCONFIGS_PROJBUILD: string;
}

export interface ComponentInfo {
  alias: string;
  target: string;
  prefix: string;
  dir: string;
  type: string;
  lib: string;
  reqs: string[];
  priv_reqs: string[];
  managed_reqs: string[];
  managed_priv_reqs: string[];
  file: string;
  sources: string[];
  include_dirs: string[];
}

export interface IIdfProjectInfo {
  version: string;
  project_name: string;
  project_version: string;
  project_path: string;
  idf_path: string;
  build_dir: string;
  config_file: string;
  config_defaults: string;
  bootloader_elf: string;
  app_elf: string;
  app_bin: string;
  build_type: string;
  git_revision: string;
  target: string;
  rev: string;
  min_rev: string;
  max_rev: string;
  phy_data_partition: string;
  monitor_baud: string;
  monitor_toolprefix: string;
  c_compiler: string;
  config_environment: ConfigEnvironment;
  common_component_reqs: string[];
  build_components: string[];
  build_component_paths: string[];
  build_component_info: Record<string, ComponentInfo>;
  all_component_info: Record<string, ComponentInfo>;
  debug_prefix_map_gdbinit: string;
}

interface FlashSettings {
  flash_mode: string;
  flash_size: string;
  flash_freq: string;
}

interface FlashFiles {
  [address: string]: string;
}

interface Section {
  offset: string;
  file: string;
  encrypted: boolean;
}

interface ExtraEsptoolArgs {
  after: string;
  before: string;
  stub: boolean;
  chip: string;
}

export interface IFlasherConfiguration {
  write_flash_args: string[];
  flash_settings: FlashSettings;
  flash_files: FlashFiles;
  bootloader: Section;
  app: Section;
  partitionTable: Section;
  otadata: Section;
  storage: Section;
  extra_esptool_args: ExtraEsptoolArgs;
}

interface EFuseEntry {
  bit_len: number;
  block: number;
  category: string;
  description: string;
  efuse_type: string;
  name: string;
  pos: number | null;
  readable: boolean;
  value: number | string | boolean;
  word: number | null;
  writeable: boolean;
}

export interface EFuseData {
  [key: string]: EFuseEntry;
}