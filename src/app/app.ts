import { Component, HostListener, ViewChild, ElementRef, OnInit, ChangeDetectorRef,} from '@angular/core';
import { FormsModule } from '@angular/forms';

interface Vocabulary {
  de: string;
  isNew?: boolean;
  vereinfachterModus?: boolean;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {

  @ViewChild('answerInput')
  answerInput!: ElementRef<HTMLInputElement>;

  @HostListener('document:keydown', ['$event'])
  handleEnter(event: KeyboardEvent) {

    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    if(this.endofquiz){
      this.startQuiz();
    }
    else{
      if (!this.answerLocked) {
        this.checkAnswer();
      } else {
        this.nextQuestion();
      }
    }
  }

  nextButtonColor = '#4CAF50';
  progressCells: string[] = [];
  vocab: Vocabulary[] = [];

  quizList: Vocabulary[] = [];
  usedWordIndices: number[] = [];
  currentWords: { index: number; word: string; }[] = [];
  index = 0;
  endofquiz = false;
  isTopicMode = false;
  vereinfachterModus = false;
  selectedVoice: SpeechSynthesisVoice | null = null;

  answer = '';

  correct = 0;
  partial = 0;
  wrong = 0;

  answerLocked = false;
  feedback = '';

  abkuerzungen: Record<string, string> = {
    PE: 'Physical Education',
    RE: 'Religious Education',
    IT: 'Information Technology'
  };

  constructor(private cdr: ChangeDetectorRef) {
    
  }

  ngOnInit(): void {

    const selectVoice = () => {

      const voices =
        speechSynthesis.getVoices();

      this.selectedVoice =

        // Windows-Favoriten
        voices.find(v =>
          v.name ===
          'Microsoft Katja Online (Natural) - German (Germany)'
        )

        ||

        voices.find(v =>
          v.name ===
          'Microsoft Katja - German (Germany)'
        )

        ||

        voices.find(v =>
          v.name ===
          'Microsoft Conrad Online (Natural) - German (Germany)'
        )

        ||

        voices.find(v =>
          v.name ===
          'Microsoft Stefan - German (Germany)'
        )

        ||

        // Android-Favoriten
        voices.find(v =>
          v.name.includes('Google') &&
          v.lang === 'de-DE'
        )

        ||

        // Apple-Favoriten
        voices.find(v =>
          v.name.includes('Anna') &&
          v.lang.startsWith('de')
        )

        ||

        voices.find(v =>
          v.name.includes('Petra') &&
          v.lang.startsWith('de')
        )

        ||

        // Irgendeine deutsche Natural Voice
        voices.find(v =>
          v.name.includes('Natural') &&
          v.lang.startsWith('de')
        )

        ||

        // Irgendeine deutsche Stimme
        voices.find(v =>
          v.lang === 'de-DE'
        )

        ||

        voices.find(v =>
          v.lang.startsWith('de')
        )

        ||

        null;

      console.log(
        'Gewählte Stimme:',
        this.selectedVoice?.name
      );
    };

    selectVoice();

    speechSynthesis.onvoiceschanged =
      selectVoice;
  }

  startQuiz() {

    this.endofquiz = false;

    const newWords =
      this.vocab.filter(v => v.isNew);

    const oldWords =
      this.vocab.filter(v => !v.isNew);

    if (newWords.length > 0 &&
        oldWords.length > 0) {

      const selectedNew =
        [...newWords]
          .sort(() => Math.random() - 0.5)
          .slice(0, 10);

      const selectedOld =
        [...oldWords]
          .sort(() => Math.random() - 0.5)
          .slice(0, 5);

      this.quizList = [
        ...selectedNew,
        ...selectedOld
      ]
      .sort(() => Math.random() - 0.5);

    }
    else {

      this.quizList =
        [...this.vocab]
          .sort(() => Math.random() - 0.5)
          .slice(0, 15);

    }

    this.progressCells =
      Array(15).fill('gray');

    this.index = 0;

    this.correct = 0;
    this.partial = 0;
    this.wrong = 0;

    this.answer = '';
    this.usedWordIndices = [];
    this.feedback = '';
    this.answerLocked = false;
    this.nextButtonColor = '#4CAF50';

    this.buildCurrentWords();
    this.cdr.detectChanges();

    this.buildCurrentWords();

    setTimeout(() => {
      this.speakWord();
    }, 300);


  }

  normalize(text: string): string {
    return text
      .trim()
      .replace(/[´`‘’‚‛‹›ʻʼʹ]/g, "'")
      .replace(/…/g, "...")
      .replace(/(\S)\.\.\./g, '$1 ...')
      .replace(/^to\s+/i, '');
  }

  normalizeLower(text: string): string {
    return this.normalize(text).toLowerCase();
  }

  erweitereAbkuerzungen(text: string): string {

    let result = text;

    for (const [kurzform, langform] of Object.entries(this.abkuerzungen)) {

      result = result.replace(
        new RegExp(`\\b${kurzform}\\b`, 'g'),
        langform
      );

    }

    return result;
  }

  removeBrackets(text: string) {
    return text.replace(/\(.*?\)/g, '').trim();
  }

  removeSpaces(text: string) {
    return text.replace(/\s+/g, '');
  }

  removePunctuation(text: string) {
    return text.replace(/[.,!?;:]/g, '').trim();
  }

  checkAnswer() {

    if (!this.answer ||
        this.answer.trim() === '') {
      return;
    }

    const correctAnswer =
      this.quizList[this.index].de;

    const userAnswer =
      this.answer.trim();

    if (userAnswer === correctAnswer) {

      this.correct++;
      this.updateProgressBar('correct');

      this.nextQuestion();

    } else {

      this.wrong++;
      this.updateProgressBar('wrong');

      this.answerLocked = true;

      this.nextButtonColor = '#f44336';

      this.feedback =
        `Falsch. Richtig wäre: ${correctAnswer}`;

    }

  }


  nextQuestion() {

    if( this.index < 14) {

      this.index++;

      if (this.index >= this.quizList.length) {
          return;
      }

      this.answer = '';
      this.usedWordIndices = [];
      this.feedback = '';
      this.answerLocked = false;

      this.nextButtonColor = '#4CAF50';

      const useWordButtons =
        this.isTopicMode &&
        this.vereinfachterModus;

      if (!useWordButtons) {

        setTimeout(() => {
            this.answerInput.nativeElement.focus();
        }, 50);

      }
    }
    else{
      this.endofquiz = true;
      return;
    }

    this.quizList[this.index].vereinfachterModus = this.vereinfachterModus;
    this.buildCurrentWords();

    setTimeout(() => {
      this.speakWord();
    }, 300);

  }

  updateProgressBar(type: string) {
    const pos =
      this.correct + this.partial + this.wrong - 1;

    if (pos >= 0 && pos < 15) {
      this.progressCells[pos] = type;
    }
  }

  focusInput() {
    setTimeout(() => {
      this.answerInput?.nativeElement.focus();
    }, 100);
  }

  onFileSelected(event: Event) {

    const input =
      event.target as HTMLInputElement;

    if (!input.files?.length) {
      return;
    }

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = () => {

      const content =
        reader.result as string;

      const lines = content
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line !== '');

      // Alte Daten löschen
      this.vocab = [];

      // Erste Zeile = Überschrift
      for (let i = 1; i < lines.length; i++) {

        const fields =
          this.parseCsvLine(lines[i]);

        // Aktuell nur eine Spalte erlaubt
        if (fields.length !== 1) {

          alert(
            'Die CSV-Datei darf aktuell nur eine Spalte enthalten.'
          );

          this.vocab = [];
          return;
        }

        this.vocab.push({
          de: fields[0].trim(),
          isNew: false
        });

      }

      this.startQuiz();
      this.cdr.detectChanges();

    };

    reader.readAsText(file, 'iso-8859-1');

  }

  parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      }
      else if (char === ';' && !inQuotes) {
        result.push(current);
        current = '';
      }
      else {
        current += char;
      }
    }

    result.push(current);

    return result;
  }


  buildCurrentWords(): void {
    if (
      !this.quizList.length ||
      this.index >= this.quizList.length
    ) {
      this.currentWords = [];
      return;
    }

    const words =
      this.quizList[this.index].de
        .trim()
        .split(/\s+/)
        .filter(word => word !== '');

    if (words.length === 1) {

      this.currentWords =
        words[0]
          .split('')
          .map((char, index) => ({
            word: char,
            index
          }))
          .sort(() => Math.random() - 0.5);

    }
    else {

      this.currentWords =
        words
          .map((word, index) => ({
            word,
            index
          }))
          .sort(() => Math.random() - 0.5);

    }
  }

  addWord(word: string, index: number): void {

    if (this.usedWordIndices.includes(index)) {
      return;
    }

    const letterMode =
      this.currentWords.length > 0 &&
      this.currentWords.every(
        item => item.word.length === 1
      );

    if (!letterMode) {

      if (
        this.answer &&
        this.answer.trim() !== ''
      ) {
        this.answer += ' ';
      }

    }

    this.answer += word;

    this.usedWordIndices.push(index);

  }


  undoLastWord(): void {

  if (this.usedWordIndices.length === 0) {
    return;
  }

  this.usedWordIndices.pop();

  this.answer = '';

  for (const index of this.usedWordIndices) {

    const currentWord =
      this.currentWords.find(
        word => word.index === index
      );

    if (!currentWord) {
      continue;
    }

    if (
      this.answer &&
      !this.isLetterMode()
    ) {
      this.answer += ' ';
    }

    this.answer += currentWord.word;

  }

}

isLetterMode(): boolean {

  return this.currentWords.length > 0 &&
         this.currentWords.every(
           item => item.word.length === 1
         );

}

  toggleVereinfachterModus(): void {

    if (this.vereinfachterModus) {

      this.answer = '';
      this.usedWordIndices = [];
      this.quizList[this.index].vereinfachterModus = true;

    }

  }

  speakWord(): void {

    if (this.quizList.length === 0) {
      return;
    }

    speechSynthesis.cancel();

    const utterance =
      new SpeechSynthesisUtterance(
        this.quizList[this.index].de
      );

    if (this.selectedVoice) {
      utterance.voice =
        this.selectedVoice;
    }

    utterance.lang = 'de-DE';
    utterance.rate = 0.8;
    utterance.pitch = 1;

    speechSynthesis.speak(utterance);

  }

}