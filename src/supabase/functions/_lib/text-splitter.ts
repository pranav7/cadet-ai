import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

export class TextSplitter {
  private splitter: RecursiveCharacterTextSplitter;

  constructor() {
    this.splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
  }

  split(text: string) {
    return this.splitter.splitText(text);
  }
}
