FROM alpine:latest
MAINTAINER https://github.com/mozilla/observatory-cli

RUN adduser -h /home/observatory -g "Observatory CLI User" -s /bin/ash -D observatory
RUN apk --update add nodejs && \
  rm -rf /var/cache/apk/* && \
  npm install -g observatory-cli

USER observatory
WORKDIR /home/observatory
ENTRYPOINT ["observatory"]
CMD ["--help"]
